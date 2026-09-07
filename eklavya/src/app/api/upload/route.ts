import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import UploadedFile from '@/models/UploadedFile';
import { generateEmbeddings } from '@/utils/embeddings';
import { upsertDocumentChunks } from '@/lib/vector/qdrant';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

export const maxDuration = 300; // Extended for rate-limited embedding (5 min)

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    if (endIndex < text.length) {
      let breakIndex = text.lastIndexOf('\n', endIndex);
      if (breakIndex < startIndex + chunkSize / 2) {
        breakIndex = text.lastIndexOf('. ', endIndex);
      }
      if (breakIndex > startIndex + chunkSize / 2) {
        endIndex = breakIndex + 1;
      }
    }
    
    chunks.push(text.slice(startIndex, endIndex).trim());
    startIndex = endIndex - overlap;
  }
  
  return chunks.filter(c => c.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const courseId = formData.get('courseId') as string;

    if (!file || !courseId) {
      return NextResponse.json({ error: 'File and courseId are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
    }

    await dbConnect();
    
    const uploadedFile = await UploadedFile.create({
      userId: session.user.id,
      courseId,
      originalName: file.name,
      storagePath: 'local',
      fileType: file.type,
      status: 'processing',
    });

    const chunks = chunkText(extractedText);
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await generateEmbeddings(batchChunks);
      
      const qdrantPoints = batchChunks.map((text, idx) => ({
        id: crypto.randomUUID(),
        text,
        embedding: embeddings[idx],
        metadata: {
          fileId: uploadedFile._id.toString(),
          userId: session.user.id,
          courseId,
          fileName: file.name,
          chunkIndex: i + idx,
        }
      }));
      
      await upsertDocumentChunks(qdrantPoints);
    }
    
    uploadedFile.status = 'completed';
    uploadedFile.embeddingsCount = chunks.length;
    await uploadedFile.save();

    return NextResponse.json({ success: true, file: uploadedFile });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
