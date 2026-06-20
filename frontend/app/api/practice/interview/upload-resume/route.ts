import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // For now, let's just log the file name and return a success message.
    // In a real scenario, you would save the file, process it, and store data in a database.
    console.log(`Received file: ${file.name}`);

    // Example: Read file content (be careful with large files)
    // const buffer = Buffer.from(await file.arrayBuffer());
    // console.log(`File content size: ${buffer.length} bytes`);

    // You would typically send this file to a service that parses the resume
    // and then store the structured data in your database.

    return NextResponse.json({ message: 'Resume uploaded successfully!', filename: file.name }, { status: 200 });
  } catch (error) {
    console.error('Error uploading resume:', error);
    return NextResponse.json({ error: 'Failed to upload resume.' }, { status: 500 });
  }
}
