import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, text, html } = body;

    // Check if required environment variables are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email environment variables are not set');
      return NextResponse.json({ success: false, message: 'Email service not configured properly' }, { status: 500 });
    }

    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: '"WEMSP" <hello@hrzhkm.xyz>',
      to,
      subject,
      text,
      html: html || undefined, // Include HTML content if provided
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, message: 'Failed to send email', error: String(error) }, { status: 500 });
  }
} 