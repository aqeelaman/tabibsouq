document.getElementById('start-journey').addEventListener('click', function() {
    window.location.href = 'signup.html'; // Assuming you want to direct users to sign up
});

var hospitals = [];
var doctors = [];

// window.onload() = getHospitals();

async function getHospitals(){
    
    try {
        const response = await fetch('/collection/hospitals');

        if (response.ok){
            hospitals = await response.json();
            console.log(hospitals);
        }
        else{
            console.log("HTTP error: "+ response.status)
        }
        
    } catch (error) {
        console.error("Error fetching hospitals: " + error);
    }
}
