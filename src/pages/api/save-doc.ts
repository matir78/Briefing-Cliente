
import type { APIRoute } from 'astro';
import { google } from 'googleapis';
import path from 'path';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  const empresa = data.get('Empresa')?.toString() || 'Sin Nombre';

  // --- 1. PREPARE CONTENT ---
  let title = `Briefing: ${empresa}`;
  let bodyContent = `\n`; // Initial spacing
  
  // Helper to format content for Docs (simple text dump for now)
  for (const [key, value] of data.entries()) {
     // Clean keys slightly
     const label = key.replace(/_/g, ' ');
     bodyContent += `${label.toUpperCase()}: ${value}\n\n`;
  }

  try {
    // --- 2. AUTHENTICATE ---
    const keyFile = path.resolve('./service-account.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'],
    });

    const docs = google.docs({ version: 'v1', auth });
    
    // --- 3. CREATE DOCUMENT ---
    const createResponse = await docs.documents.create({
      requestBody: {
        title: title,
      },
    });

    const documentId = createResponse.data.documentId;
    if (!documentId) throw new Error('Failed to create document');

    // --- 4. INSERT CONTENT ---
    // Google Docs API works with requests (index 1 is usually the start of the body)
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              index: 1,
              text: bodyContent,
            },
          },
          {
            insertText: {
              index: 1,
              text: `REPORTE DE PROYECTO WEB\n=======================\n`,
            }
          }
        ],
      },
    });

    // --- 5. RETURN URL ---
    return new Response(JSON.stringify({ 
        success: true, 
        message: 'Documento creado exitosamente',
        url: `https://docs.google.com/document/d/${documentId}/edit`
    }), {
      status: 200,
    });

  } catch (error: any) {
    console.error('Google Docs Error:', error);
    return new Response(JSON.stringify({ 
        error: error.message || 'Error creating Google Doc',
        details: 'Check server logs. Ensure service-account.json is valid.'
    }), { status: 500 });
  }
};
