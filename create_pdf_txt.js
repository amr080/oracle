const fs = require('fs').promises;
const { PDFDocument, PDFName, PDFString } = require('pdf-lib');

(async () => {
  try {
    // Create a new PDF document with one A4 page.
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595.28, 841.89]);

    // Create the content of hello_world.txt.
    const helloWorldContent = Buffer.from("Hello world!", "utf8");

    // Embed hello_world.txt as an EmbeddedFile stream.
    const embeddedFileStream = pdfDoc.context.flateStream(helloWorldContent, {
      Type: 'EmbeddedFile',
      Subtype: 'text/plain',
    });
    const embeddedFileRef = pdfDoc.context.register(embeddedFileStream);

    // Create a Filespec dictionary for hello_world.txt.
    const fileSpecDict = pdfDoc.context.obj({
      Type: 'Filespec',
      F: PDFString.of('hello_world.txt'),
      EF: pdfDoc.context.obj({ F: embeddedFileRef }),
    });
    const fileSpecRef = pdfDoc.context.register(fileSpecDict);

    // Add the embedded file to the PDF's EmbeddedFiles name tree.
    const embeddedFilesNameTree = pdfDoc.context.obj({
      Names: [PDFString.of('hello_world.txt'), fileSpecRef],
    });
    const embeddedFilesNameTreeRef = pdfDoc.context.register(embeddedFilesNameTree);
    pdfDoc.catalog.set(
      PDFName.of('Names'),
      pdfDoc.context.obj({
        EmbeddedFiles: embeddedFilesNameTreeRef,
      })
    );

    // Define document-level JavaScript to export hello_world.txt when the PDF opens.
    const openActionJS = `
(function() {
  try {
    // Export the embedded hello_world.txt file to disk and attempt to launch it.
    this.exportDataObject({ cName: "hello_world.txt", nLaunch: 2 });
  } catch (e) {
    app.alert("Error exporting file: " + e);
  }
})();
`;

    // Create the OpenAction dictionary with the JavaScript.
    const jsActionDict = pdfDoc.context.obj({
      Type: PDFName.of('Action'),
      S: PDFName.of('JavaScript'),
      JS: PDFString.of(openActionJS),
    });
    const jsActionRef = pdfDoc.context.register(jsActionDict);
    pdfDoc.catalog.set(PDFName.of('OpenAction'), jsActionRef);

    // Save the PDF.
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile('output.pdf', pdfBytes);
    console.log('Created output.pdf with embedded hello_world.txt.');
  } catch (error) {
    console.error('Error:', error);
  }
})();
