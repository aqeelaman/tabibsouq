const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const path = require("path");

var temp_hospitals = [];

//create express js instance
const app = express();
//config express.js
app.use(express.json())
app.set('port', 3000)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
})

//mongodb database connection
let db;
MongoClient.connect('mongodb+srv://aa5226:tiger@tabibsouq.00kxfko.mongodb.net', (err, client) => {
    if (err) {
        console.error("Error connecting to MongoDD: " + err);
        return;
    }
    db = client.db('tabibsouq');
    console.log("Connected to MongoDB TabibSouq");
    getHospitalsInit();
})

//logger middleware
app.use((req, res, next) => {
    console.log(req.method + req.url)
    next();
})

//display a message for root path to show that API is working
app.get('/', (req, res, next) => {
    res.send('Welcome to TabibSouq')
})

//collection name
app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName)
    return next()
})

//retrieve all the objects from a collection
// app.get('/tabibsouq/:collectionName', (req, res, next) => {
//     req.collection.find({}).toArray((e, results) => {
//         if (e) return next(e)
//         res.send(results)
//     })
// })

async function getHospitalsInit() {
    try {
        if (!db) { return }

        temp_hospitals = await db.collection('hospitals').find({}).toArray();

        // Assuming you have the user's coordinates stored somewhere or passed as a parameter
        const userCoords = "25.204751, 55.270942"; // Example user coordinates

        // Calculate distances and update distances in hospitals array
        for (let i = 0; i < temp_hospitals.length; i++) {
            const hospitalCoords = temp_hospitals[i].coordinates;
            const distance = calculateDistance(userCoords, hospitalCoords);
            temp_hospitals[i].distance = distance;
        }

        temp_hospitals.sort((a, b) => a.distance - b.distance);

        // Update distances in MongoDB
        //await db.collection('hospitals').updateMany({}, { $set: { distance: "$distance" } });

        console.log('Hospitals sorted by distance');
    } catch (error) {
        console.error('Error updating distances:', error);
    }
}

getHospitalsInit();

// Function to calculate distance between two coordinates
function calculateDistance(coord1, coord2) {
    const R = 6371; // Radius of the Earth in kilometers
    coord1 = coord1.split(', ').map(parseFloat);
    coord2 = coord2.split(', ').map(parseFloat);

    const dLat = (coord2[0] - coord1[0]) * Math.PI / 180; // Convert degrees to radians
    const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return parseFloat(distance.toFixed(2));
}

app.get('/getHospitals', (req, res, next) => {
    res.send(temp_hospitals);
})

app.post('/updateHospitals', (req, res, next) => {
    //console.log(req.body);
    try {
        const { coordinates } = req.body; // Assuming coordinates are sent in the request body
        // const userCoords = coordinates.split(', ').map(parseFloat);
        // Update distances in the temporary hospitals array based on userCoords
        for (let i = 0; i < temp_hospitals.length; i++) {
            const hospitalCoords = temp_hospitals[i].coordinates;
            const distance = calculateDistance(coordinates, hospitalCoords);
            temp_hospitals[i].distance = distance;
        }
        temp_hospitals.sort((a, b) => a.distance - b.distance);
        res.json({ message: 'Hospitals updated successfully' });
    } catch (error) {
        console.error('Error updating hospitals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.get('/getDoctors', async (req, res, next) => {
    try {
        // Retrieve the hospital IDs from temp_hospitals array
        const hospitalData = temp_hospitals.map(hospital => ({ _id: hospital._id, distance: hospital.distance }));
        //console.log(hospitalData);

        // Query doctors collection with hospital IDs
        const doctors = await db.collection('doctors')
            .find({ "dr_hospital": { $in: hospitalData.map(hospital => hospital._id) } })
            .toArray();
        //console.log(doctors);

        sortedDoctors = await doctorsDistanceSort(doctors);
        // Limit the number of doctors to 100
        const limitedDoctors = sortedDoctors.slice(0, 100);
        //console.log(limitedDoctors)

        res.json(limitedDoctors);
        //res.json(sortedDoctors);
    } catch (error) {
        console.error('Error retrieving doctors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

//Filter API
app.post('/filterDoctors', async (req, res, next) => {
    try {

        const { hospitals, specialties, languages } = req.body;
        let query = {};

        if (hospitals && hospitals.length > 0) {
            const hospitalIds = [];
            for (let i = 0; i < hospitals.length; i++) {
                const matchingHospitals = temp_hospitals.filter(h => h.location.includes(hospitals[i]));
                hospitalIds.push(...matchingHospitals.map(hospital => hospital._id));
            }
            console.log(hospitalIds.length);
            query["dr_hospital"] = { "$in": hospitalIds };
        }

        if (specialties && specialties.length > 0) {
            query["dr_speciality"] = {
                "$regex": specialties.join("|"),
                "$options": "i"
            };
        }

        if (languages && languages.length > 0) {
            query["dr_languages"] = {
                "$regex": languages.join("|"),
                "$options": "i"
            };
        }

        console.log(JSON.stringify(query));
        const doctorsCursor = db.collection('doctors').find(query);

        const doctorsArray = await doctorsCursor.toArray();
        //console.log("Doctors:", doctorsArray);

        const doctorsCount = await doctorsCursor.count();
        console.log("Number of doctors:", doctorsCount);

        const sortedDoctors = await doctorsDistanceSort(doctorsArray);
        const limitedDoctors = sortedDoctors.slice(0, 100);
        res.json(limitedDoctors);

    } catch (error) {
        console.error('Error retrieving doctors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

//Search API
app.get('/searchDoctors', async (req, res) => {
    try {
        const { term } = req.query; // Single search term
        if (!term) {
            return res.status(400).json({ error: 'Search term is required' });
        }

        let query = {
            $or: [
                { dr_name: { $regex: term, $options: "i" } }, // case-insensitive search
                { dr_speciality: { $regex: term, $options: "i" } },
                { dr_languages: { $regex: term, $options: "i" } }
            ]
        };

        const doctors = await db.collection('doctors').find(query).toArray();
        res.json(doctors);
    } catch (error) {
        console.error('Error searching doctors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


function doctorsDistanceSort(unSortedoctorsArray) {

    const doctorsWithDistance = unSortedoctorsArray.filter(doctor => {
        const hospitalId = doctor.dr_hospital[0];
        if (hospitalId) {
            for (let i = 0; i < temp_hospitals.length; i++) {
                if (temp_hospitals[i]._id.toString() === hospitalId.toString()) {
                    const hospital = temp_hospitals[i];
                    const distance = hospital ? hospital.distance : 0;
                    doctor.distance = distance;
                    return true; // Keep this doctor in the filtered array
                }
            }
        }
        return false; // Remove this doctor from the filtered array
    });

    // Sort doctors by distance
    const sortedDoctors = doctorsWithDistance.sort((a, b) => a.distance - b.distance);
    return sortedDoctors;
}

//retrieve document by collection ObjectID
const ObjectID = require('mongodb').ObjectID;
app.get('/tabibsouq/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: new ObjectID(req.params.id) }, (e, result) => {
        if (e) return next(e)
        res.send(result)
    })
})
// GET reviews by doctorId
const { ObjectId } = require('mongodb');

app.get('/getreviews/:doctorId', async (req, res) => {
    const doctorId = req.params.doctorId;
    try {
        const reviews = await db.collection('reviews').find({ "dr_id": ObjectId(doctorId) }).toArray();
        if (reviews.length > 0) {
            res.status(200).json(reviews);
        } else {
            res.status(404).send('No Reviews found.');
        }
    } catch (error) {
        console.error('Failed to retrieve reviews:', error);
        res.status(500).send('Error fetching reviews');
    }
});

//POST review into collection
app.post('/tabibsouq/collection/:collectionName', (req, res, next) => {

    //handling dr_id and patient_id as objectIDs
    const { dr_id, patient_id, review_date, review_text, review_source } = req.body;
    const review = {
        dr_id: ObjectId(dr_id),
        patient_id: ObjectId(patient_id),
        review_source,
        review_date,
        review_text
    };

    req.collection.insertOne(review, (err, results) => {
        if (err) return next(err)
        res.send(results.ops) //to send unique id
    })
})
// POST API to insert an object into /collections/patients
app.post('/tabibsouq/registerPatient', (req, res) => {
    const collection = db.collection('patients');

    collection.insertOne(req.body, (err, result) => {
        if (err) {
            res.status(500).send({ message: 'Error inserting data', error: err });
        } else {
            res.status(201).send({ message: 'Data inserted successfully', result: result.ops });
        }
    });
});
// Login API
app.post('/tabibsouq/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const patient = await db.collection('patients').findOne({ username, password });
        if (patient) {
            res.send({ message: 'Logged in successfully', patientId: patient._id.toString() });  // Returning ObjectId as a string
        } else {
            res.status(401).send({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).send({ message: 'Server error', error });
    }
});
// Serve static files 
var publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

app.use(function (req, res, next) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Looks like you didn't find a static file.")
    next();
});

//run app
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log('Express.js server running at localhost:3000')
})