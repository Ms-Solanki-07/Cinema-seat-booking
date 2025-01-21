toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": false,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "7000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
}

const movies = [
    { id: 1, name: "XYZ 1 Movie Name", cost: 149, seats: new Array(75).fill(0) },
    { id: 2, name: "XYZ 2 Movie Name", cost: 189, seats: new Array(75).fill(0) },
    { id: 3, name: "XYZ 3 Movie Name", cost: 199, seats: new Array(75).fill(0) },
    { id: 4, name: "XYZ 4 Movie Name", cost: 249, seats: new Array(75).fill(0) }
];

let selectedMovie = null;
let selectedSeats = [];

function saveBookings() {
    localStorage.setItem("movies", JSON.stringify(movies));
}

function loadBookings() {
    const storedMovies = localStorage.getItem("movies");
    if (storedMovies) {
        const parsedMovies = JSON.parse(storedMovies);
        movies.forEach((movie, index) => {
            movie.seats = parsedMovies[index].seats;
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    renderSeats(true); // Render seats blurred initially
    updateInfo();
});

function selectMovie() {
    const movieSelect = document.getElementById("movieSelect");
    const movieId = parseInt(movieSelect.value);
    selectedSeats = [];
    document.getElementById("bookButton").disabled = true;
    document.getElementById("seatContainer").innerHTML = "";

    if (movieId) {
        selectedMovie = movies.find(movie => movie.id === movieId);
        renderSeats(false); // Remove blur for available seats
    } else {
        selectedMovie = null;
        renderSeats(true); // Keep seats blurred when no movie is selected
    }

    updateInfo();
}

function renderSeats(isBlurred = false) {
    const seatContainer = document.getElementById("seatContainer");
    seatContainer.className = "seats"; // Reset class
    if (isBlurred) seatContainer.classList.add("blur");

    seatContainer.innerHTML = "";
    for (let i = 0; i < 75; i++) {
        const seatDiv = document.createElement("div");
        seatDiv.className = "seat";
        seatDiv.id = `seat-${i}`;
        seatDiv.textContent = i + 1;

        if (selectedMovie && selectedMovie.seats[i] === 1) {
            seatDiv.classList.add("booked");
        }

        if (!isBlurred) {
            seatDiv.addEventListener("click", () => toggleSeat(i));
            seatDiv.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") toggleSeat(i);
            });
        }
        seatContainer.appendChild(seatDiv);
    }
}

let bookingDetails = {}; // Global object to store user details and booking data

function bookSeats(event) {
    event.preventDefault(); // Prevent form submission and page reload

    if (!selectedMovie) {
        toastr.error("Please select a movie first.", "Error");
        return;
    }

    if (selectedSeats.length === 0) {
        toastr.error("Please select at least one seat to proceed.", "Error");
        return;
    }

    const fullName = document.getElementById("fullName").value.trim();
    const mobileNumber = document.getElementById("mobileNumber").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!fullName || !mobileNumber || !email) {
        toastr.info("Please fill in all mandatory fields.", "Info");
        return;
    }

    const totalCost = selectedSeats.length * selectedMovie.cost;

    if (confirm(`Total cost: ₹${totalCost}. Confirm booking?`)) {
        selectedSeats.forEach(index => selectedMovie.seats[index] = 1);

        bookingDetails = {
            fullName,
            mobileNumber,
            email,
            selectedMovie: selectedMovie.name,
            seatNumbers: selectedSeats.map(seat => seat + 1).join(", "),
            totalCost
        };

        saveBookings();
        renderSeats();
        updateInfo();

        document.getElementById("downloadTicketButton").disabled = false;
        toastr.success("Booking Successful!", "Success");
    }
    else {
        toastr.warning("Booking Cancel!", "Cancel");
    }
}



function generateTicket() {
    const fullName = document.getElementById("fullName").value.trim();
    const mobileNumber = document.getElementById("mobileNumber").value.trim();
    const email = document.getElementById("email").value.trim();
    const seatNumbers = selectedSeats.map(seat => seat + 1).join(", ");
    const totalCost = selectedSeats.length * selectedMovie.cost;
    const movieSelect = document.getElementById("movieSelect");
    const hallNo = movieSelect.value;

    const currentDate = new Date();
    const day = String(currentDate.getDate()).padStart(2, '0'); // Get the day
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Get the month (0-indexed)
    const year = currentDate.getFullYear(); // Get the year

    const customFormattedDate = `${day}/${month}/${year}`;

    if (!fullName || !mobileNumber || !email || !selectedMovie || selectedSeats.length === 0) {
        toastr.error("Please complete all fields and select at least one seat.", "Error");
        return;
    }

    // console.log('HELLO',{ fullName, mobileNumber, email, seatNumbers, totalCost, selectedMovie: selectedMovie.name }); // Debugging

    const apiUrl = {
        render: 'https://cinema-seat-booking.onrender.com/generate-ticket',
        local: 'http://localhost:3000/generate-ticket'
      };

    fetch(apiUrl.render || apiUrl.local, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fullName,
            mobileNumber,
            email,
            seatNumbers,
            totalCost,
            selectedMovie: selectedMovie.name,
            customFormattedDate,
            hallNo,
        }),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to generate ticket!');
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Ticket_${fullName}_${Date.now()}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);

            setTimeout(()=>{
                toastr.success(`${fullName}, Your ticket has been emailed successfully.`, "Success");
            },2000);

            bookingDetails = {};
            clearDetails();
        })
        .catch(error => {
            console.error('Error downloading ticket:', error);
            toastr.error(error.message, "Error");
        });
}

function updateInfo() {
    document.getElementById("seatCount").textContent = `Seats Selected: ${selectedSeats.length}`;
    document.getElementById("totalCost").textContent = `Total Cost: ₹${selectedSeats.length * (selectedMovie ? selectedMovie.cost : 0)}`;
}

function clearDetails() {
    document.getElementById("fullName").value = "";
    document.getElementById("mobileNumber").value = "";
    document.getElementById("email").value = "";
    document.getElementById("bookButton").disabled = true;
    document.getElementById("downloadTicketButton").disabled = true;
    selectedSeats = [];
    updateInfo();
}


// Load saved bookings when the page loads
window.onload = () => {
    loadBookings();
    updateInfo();
    // resetSeats()
};

function resetSeats() {
    if (confirm("Are you sure you want to reset all seat bookings? This action cannot be undone.")) {
        movies.forEach(movie => {
            movie.seats = new Array(movie.seats.length).fill(0);
        });

        toastr.success("All seats have been reset successfully!", "Success");

        saveBookings(); // Save the reset state
        selectedSeats = [];
        renderSeats();
        updateInfo();
    }
}

function validateInputs() {
    const fullName = document.getElementById("fullName").value.trim();
    const mobileNumber = document.getElementById("mobileNumber").value.trim();
    const email = document.getElementById("email").value.trim();
    const isValidEmail = /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
    const isValidMobile = /^[0-9]{10}$/.test(mobileNumber);

    // Enable the book button only if all inputs are valid and seats are selected
    const isFormValid = fullName && isValidMobile && isValidEmail && selectedSeats.length > 0;
    document.getElementById("bookButton").disabled = !isFormValid;
}

// Add input listeners to validate form fields in real time
document.getElementById("fullName").addEventListener("input", validateInputs);
document.getElementById("mobileNumber").addEventListener("input", validateInputs);
document.getElementById("email").addEventListener("input", validateInputs);

function toggleSeat(index) {
    if (selectedMovie.seats[index] === 1) return;

    const seatDiv = document.getElementById(`seat-${index}`);
    seatDiv.classList.toggle("selected");

    if (selectedSeats.includes(index)) {
        selectedSeats = selectedSeats.filter(seat => seat !== index);
    } else {
        selectedSeats.push(index);
    }

    updateInfo();
    validateInputs();
}

function showSide() {
    const side = document.querySelector('.sidebar')
    side.style.display = 'flex';
}

function closeSide() {
    const side = document.querySelector('.sidebar')
    side.style.display = 'none';
}

let aboutsEle = document.getElementsByClassName("about-us");
for (let i = 0; i < aboutsEle.length; i++) {
    aboutsEle[i].addEventListener("click", () => { 
        closeSide()
        document.querySelector("footer").scrollIntoView({ behavior: "smooth" });
    });
}


