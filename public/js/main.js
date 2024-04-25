
var hospitals;
var map;
var marker;
var hospitalMarkersArray = []; // Array to store hospital markers
var currentWindow = null;
var myLatlng;

init()
function init() {
    if (window.location.href === "http://localhost:3000/html/index.html") {
        index();
    }
}

async function index() {

    //if (sessionStorage.getItem(newUser) == null) {
    await getHospitals();
    //await getDoctors();
    await initMap();
    //sessionStorage.setItem("newUser", false);
    //}
};

async function getHospitals() {
    try {
        const response = await fetch('/getHospitals');

        if (response.ok) {
            hospitals = await response.json();
            console.log(hospitals);
        }
        else {
            console.log("HTTP error: " + response.status)
        }

    } catch (error) {
        console.error("Error fetching hospitals: " + error);
    }

}

function initMap() {

    document.getElementById('map-button').addEventListener('click', function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition, showError);
        } else {
            //document.getElementById('locationInfo').innerHTML = "Geolocation is not supported by this browser.";
            console.log("Geolocation is not supported by this browser.")
        }
    });

    if (sessionStorage.getItem("location") == null) {
        var myLatlng = new google.maps.LatLng(25.204751, 55.270942);
        sessionStorage.setItem("location", myLatlng);
    }
    else {
        var coords = sessionStorage.getItem("location").replace(/[()]/g, '').split(',');
        var myLatlng = new google.maps.LatLng(parseFloat(coords[0]), parseFloat(coords[1]));
    }
    //var myLatlng = sessionStorage.getItem("location") || new google.maps.LatLng(25.204751, 55.270942);

    map = new google.maps.Map(document.getElementById('map-container'), {
        center: myLatlng,
        zoom: 16,
        disableDefaultUI: true,
        mapTypeControl: false,
        styles: [
            {
                featureType: "poi",
                stylers: [{ visibility: "off" }],
            },
            {
                featureType: "transit",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }]
            }
        ],
    });

    // Create the initial marker
    marker = new google.maps.Marker({
        map: map,
        position: myLatlng,
        title: "Dubai",
        draggable: true
    });

    // Add click event listener to map
    google.maps.event.addListener(map, 'click', function (event) {
        var myLatlng = new google.maps.LatLng(event.latLng.lat(), event.latLng.lng());
        marker.setPosition(myLatlng);
        sessionStorage.setItem("location", myLatlng);
        updateHospitals(myLatlng)
            .then(() => { hospitalMarkers(); })
            .catch(error => { console.error('Error updating hospitals:', error); });
    });

    // Add dragend event listener to marker
    google.maps.event.addListener(marker, 'dragend', function (event) {
        myLatlng = marker.getPosition();
        sessionStorage.setItem("location", myLatlng);
        updateHospitals(myLatlng)
            .then(() => { hospitalMarkers(); })
            .catch(error => { console.error('Error updating hospitals:', error); });
    });

    hospitalMarkers(); // Initial call to show hospital markers
}

async function updateHospitals(userCoords) {
    coordinates = `${userCoords.lat()}, ${userCoords.lng()}`
    try {
        const response = await fetch('/updateHospitals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ coordinates })
        });
        if (response.ok) {
            const data = await response.json();
            console.log(data.message);
            await getHospitals();
            await displayNearByDoctors();
        } else {
            console.error('Failed to update hospitals:', response.statusText);
        }
    } catch (error) {
        console.error('Error updating hospitals:', error);
    }
}

// Function to display user's position
function showPosition(position) {
    myLatlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    marker.setPosition(myLatlng);
    map.setCenter(myLatlng);
    map.setZoom(17);
    sessionStorage.setItem("location", myLatlng);
    updateHospitals(myLatlng)
        .then(() => { hospitalMarkers(); })
        .catch(error => { console.error('Error updating hospitals:', error); });
}

// Function to handle errors in geolocation
function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            document.getElementById('locationInfo').innerHTML = "User denied the request for Geolocation.";
            break;
        case error.POSITION_UNAVAILABLE:
            document.getElementById('locationInfo').innerHTML = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            document.getElementById('locationInfo').innerHTML = "The request to get user location timed out.";
            break;
        case error.UNKNOWN_ERROR:
            document.getElementById('locationInfo').innerHTML = "An unknown error occurred.";
            break;
    }
}

// Function to display hospital markers
function hospitalMarkers() {
    if (!hospitals) {
        return;
    }

    // Clear existing markers
    clearHospitalMarkers();

    // Iterate through hospitals data
    for (let i = 0; i < hospitals.length; i++) {
        // Extract latitude and longitude from coordinates string
        let coords = hospitals[i].coordinates.split(", ");
        let latLng = new google.maps.LatLng(parseFloat(coords[0]), parseFloat(coords[1]));

        var hospitalIcon = {
            url: 'https://maps.google.com/mapfiles/ms/icons/hospitals.png', // URL of the custom icon
            scaledSize: new google.maps.Size(30, 30) // Size of the icon
        };

        // Create marker for each hospital
        let hospitalMarker = new google.maps.Marker({
            map: map,
            position: latLng,
            title: hospitals[i].location,
            icon: hospitalIcon
        });

        // Calculate distance from user marker (if available)
        if (marker) {
            let contentString = '<div><strong>' + hospitals[i].location + '</strong><br><strong>' + hospitals[i].distance + ' km</strong> </div>';
            let infowindow = new google.maps.InfoWindow({
                content: contentString
            });

            // Add click event listener to marker to open info window
            google.maps.event.addListener(hospitalMarker, 'click', function () {
                if (currentWindow) currentWindow.close()
                infowindow.open(map, hospitalMarker);
                currentWindow = infowindow;
            });
        }

        // Store marker in array
        hospitalMarkersArray.push(hospitalMarker);
    }
}

// Function to clear existing hospital markers
function clearHospitalMarkers() {
    for (let i = 0; i < hospitalMarkersArray.length; i++) {
        hospitalMarkersArray[i].setMap(null);
    }
    hospitalMarkersArray = [];
    currentWindow = null;
}


function drSpeciality(dr_speciality) {
    var str = dr_speciality[0];
    for (let i = 1; i < dr_speciality.length; i++) {
        str += ", "
        str += dr_speciality[i];
    }
    return str;
}

function drHospital(dr_hospital) {
    for (let i = 0; i < hospitals.length; i++) {
        if (dr_hospital[0] == hospitals[i]._id) {
            return hospitals[i];
        }
    }
}

function drDistance(dr_hospital) {
    for (let i = 0; i < hospitals.length; i++) {
        if (dr_hospital[0] == hospitals[i]._id) {
            return hospitals[i].distance;
        }
    }
}

function drLanguages(dr_languages) {
    var str = dr_languages[0];
    for (let i = 1; i < dr_languages.length; i++) {
        str += ", "
        str += dr_languages[i];
    }
    return str;
}

function drExperience(dr_experience) {
    var str = dr_experience[0];
    for (let i = 1; i < dr_experience.length; i++) {
        str += ", "
        str += dr_experience[i];
    }
    return str;
}

function drEducation(dr_education) {
    var str = dr_education[0];
    for (let i = 1; i < dr_education.length; i++) {
        str += ", "
        str += dr_education[i];
    }
    return str;
}

function generateRatingStars(rating) {
    var stars = '';
    var fullStars = Math.floor(rating);
    var halfStars = Math.ceil(rating - fullStars);
    var emptyStars = 5 - fullStars - halfStars;

    for (var i = 0; i < fullStars; i++) {
        stars += '<span class="star">&#9733;</span>';
    }

    if (halfStars === 1) {
        stars += '<span class="star">&#9734;&#9733;</span>'; // Half star
    }

    for (var j = 0; j < emptyStars; j++) {
        stars += '<span class="star">&#9734;</span>';
    }

    return stars;
}
