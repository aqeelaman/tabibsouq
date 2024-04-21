// document.getElementById('start-journey').addEventListener('click', function () {
//     window.location.href = 'signup.html'; // Assuming you want to direct users to sign up
// });



var hospitals = [];
var doctors = [];
// Define global variables
var map;
var marker;
var hospitalMarkersArray = []; // Array to store hospital markers
var currentWindow = null;

window.onload = init();

async function init() {
    await getHospitals();
    initMap();
};

async function getHospitals() {

    try {
        const response = await fetch('/collection/hospitals');

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

    
    var myLatlng = new google.maps.LatLng(25.204751, 55.270942);
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
        hospitalMarkers(); // Update hospital markers when map is clicked
    });

    // Add dragend event listener to marker
    google.maps.event.addListener(marker, 'dragend', function (event) {
        hospitalMarkers(); // Update hospital markers when marker is dragged
    });

    hospitalMarkers(); // Initial call to show hospital markers
}

// Function to display user's position
function showPosition(position) {
    var myLatlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    marker.setPosition(myLatlng);
    map.setCenter(myLatlng);
    map.setZoom(17);
    hospitalMarkers(); // Update hospital markers when user's position is obtained
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

// Function to calculate distance between two coordinates
function calculateDistance(coord1, coord2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (coord2.lat() - coord1.lat()) * Math.PI / 180; // Convert degrees to radians
    const dLon = (coord2.lng() - coord1.lng()) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1.lat() * Math.PI / 180) * Math.cos(coord2.lat() * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance.toFixed(2);
}

// Function to display hospital markers
function hospitalMarkers() {
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
            hospitals[i].distance = calculateDistance(marker.getPosition(), latLng);
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



