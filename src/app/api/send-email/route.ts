import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, text } = body;

    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        // These should be stored in environment variables in production
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Replace with your email or use env variable
        pass: process.env.EMAIL_PASS || 'your-app-password', // Replace with your app password or use env variable
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com', // Replace with your email or use env variable
      to,
      subject,
      text,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, message: 'Failed to send email', error: String(error) }, { status: 500 });
  }
} 