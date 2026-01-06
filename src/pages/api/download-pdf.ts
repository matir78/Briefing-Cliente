
import type { APIRoute } from 'astro';
import PDFDocument from 'pdfkit';

export const POST: APIRoute = async ({ request }) => {
    const data = await request.formData();
    const empresa = data.get('Empresa')?.toString() || 'Sin Nombre';

    // Colors (from global.css)
    const colors = {
        bg: '#0f172a',    // Global Slate 900
        card: '#1e293b',  // Global Card
        text: '#e2e8f0',  // Global Text
        accent: '#3b82f6', // Global Blue 500
        gold: '#f59e0b',  // Global Gold
        success: '#10b981', // Global Green
        border: '#334155' // Border color
    };

    const chunks: Uint8Array[] = [];
    // Use A4 size and slightly smaller margin
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.on('data', (chunk) => chunks.push(chunk));

    const bufferPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });

    // --- BACKGROUND ---
    // Draw a big rectangle to color the page
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.bg);

    // --- HEADER ---
    // Draw header background
    doc.rect(0, 0, doc.page.width, 100).fill(colors.card);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').fillColor(colors.accent)
        .text(`Briefing: ${empresa}`, 40, 40, { width: 500 });

    // Subtitle (ID and date)
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8')
        .text(`ID: BRIEF-${Date.now().toString(36).toUpperCase()}  |  Fecha: ${new Date().toLocaleDateString()}`, 40, 75);

    // Spacing after header
    let y = 140;

    // --- CONTENT SECTION ---

    const drawEntry = (key: string, value: string) => {
        // Check for page break (margin at bottom)
        if (y > 750) {
            doc.addPage();
            // Draw background for new page
            doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.bg);
            y = 50;
        }

        // Label Background (Rounded Card)
        doc.roundedRect(40, y, 180, 40, 5).fill(colors.card);

        // Label Text (Gold Color)
        doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.gold)
            // Adjust vertical position to center in the card
            .text(key.replace(/_/g, ' ').toUpperCase(), 50, y + 15, { width: 160, align: 'left' });

        // Value Text (White/Slate Color)
        doc.fontSize(11).font('Helvetica').fillColor(colors.text)
            .text(value, 240, y + 14, { width: 300 });

        // Separator Line (Subtle)
        doc.moveTo(40, y + 45).lineTo(550, y + 45).lineWidth(1).strokeColor(colors.border).stroke();

        y += 55; // Increment Y position for next item
    };

    // Iterate over form data
    for (const [key, value] of data.entries()) {
        // Skip hidden fields or empty ones if preferred, but for now show all
        drawEntry(key, value.toString());
    }

    // --- FOOTER ---
    const footerY = doc.page.height - 40;
    doc.fontSize(9).fillColor('#64748b')
        .text('Reporte generado automáticamente por Web Carmelo Form.', 0, footerY, { align: 'center', width: doc.page.width });

    // Finalize PDF
    doc.end();

    const buffer = await bufferPromise;

    return new Response(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Briefing_${empresa.replace(/\s+/g, '_')}.pdf"`,
        },
    });
};
