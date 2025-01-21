const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

const { rgb } = require('pdf-lib');

// Middleware  
app.use(express.json());
app.use(cors({
    origin: ['https://cinema-seat-booking.onrender.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
})); 
app.use(express.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public')));

// Preflight Requests
app.options('*', cors());

// API endpoint to generate the ticket
app.post('/generate-ticket', async (req, res) => {
    try {
        const { fullName, mobileNumber, email, seatNumbers, totalCost, selectedMovie, customFormattedDate, hallNo } = req.body;

        // Load the ticket template PDF
        const templatePath = path.join(__dirname, 'ticket.pdf');
        if (!fs.existsSync(templatePath)) {
            throw new Error('Template PDF not found');
        }

        const existingPdfBytes = fs.readFileSync(templatePath);

        // Create a new PDF with user data
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Draw user details on the PDF
        firstPage.drawText(`${fullName}`, { x: 330, y: 658, color: rgb(1, 1, 1), size: 14 });
        firstPage.drawText(`${mobileNumber}`, { x: 372, y: 639, color: rgb(1, 1, 1), size: 14 });
        firstPage.drawText(`${email}`, { x: 351, y: 622, color: rgb(1, 1, 1), size: 14 });
        firstPage.drawText(`${selectedMovie}`, { x: 392, y: 577, color: rgb(1, 1, 1), size: 14 });
        firstPage.drawText(`${seatNumbers}`, { x: 362, y: 502, color: rgb(1, 1, 1), size: 14 });
        firstPage.drawText(`${totalCost}`, { x: 424, y: 548, color: rgb(1, 1, 1), size: 14 });
        firstPage.drawText(`${customFormattedDate}`, { x: 462, y: 598, color: rgb(1, 1, 1), size: 14 });
        firstPage.drawText(`${hallNo}`, { x: 298, y: 490, color: rgb(1, 1, 1), size: 28 });

        // Save the modified PDF
        const pdfBytes = await pdfDoc.save();
        const ticketPath = path.join(__dirname, `ticket_${Date.now()}.pdf`);
        fs.writeFileSync(ticketPath, pdfBytes);

        // Configure Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EU, // Replace with your email
                pass: process.env.EP, // Replace with your email password or app-specific password
            },
        });

        // Email options
        const mailOptions = {
            from: '"Cinema Booking" mssolanki9166@gmail.com',
            to: email,
            subject: 'Your Cinema Ticket',
            text: `Hello ${fullName},\n\nYour ticket for "${selectedMovie}" has been successfully booked.`,
            attachments: [
                {
                    filename: `ticket_${Date.now()}.pdf`,
                    path: ticketPath, // Path to the saved PDF
                },
            ],
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            // Delete the temporary file after sending
            fs.unlinkSync(ticketPath);

            if (error) {
                console.error('Error sending email:', error.message);
                return res.status(500).json({ status: 'error', message: 'Failed to send ticket via email' });
            }

            console.log('Email sent:', info.response);

            return res.status(200).json({ status: 'success', message: 'Ticket emailed successfully!' });
        });

        // Set response headers
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="ticket_${Date.now()}.pdf"`,
            'Content-Length': pdfBytes.length,
        });

        // Send the PDF bytes as binary data
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('Error generating ticket:', error.message);
        res.status(500).json({ status: 'error', message: 'Failed to generate ticket' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
