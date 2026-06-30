import { NextResponse } from "next/server";
import multer from "multer";
import { Readable } from "stream";

// Disable Next.js body parsing is not needed in App Router since body is not parsed by default

// Set up Multer configuration with size limits and mime-type whitelist
const upload = multer({
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG and PDF files are allowed"));
    }
  },
});

// Helper to convert standard web Request to a Node.js stream that Multer can process
function webRequestToNodeStream(req: Request, bodyBuffer: Buffer): any {
  const nodeReq: any = new Readable();
  nodeReq._read = () => {};

  nodeReq.headers = {};
  req.headers.forEach((value, key) => {
    nodeReq.headers[key] = value;
  });

  nodeReq.method = req.method;
  nodeReq.push(bodyBuffer);
  nodeReq.push(null); // End of stream

  return nodeReq;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, error: "Only multipart/form-data requests are allowed" },
        { status: 400 }
      );
    }

    // Read body as ArrayBuffer and convert to Buffer
    const arrayBuffer = await req.arrayBuffer();
    const bodyBuffer = Buffer.from(arrayBuffer);

    // Convert standard request to Node.js stream
    const nodeReq = webRequestToNodeStream(req, bodyBuffer);
    const dummyRes = {};

    // Run Multer handler
    await new Promise<void>((resolve, reject) => {
      upload.single("receipt")(nodeReq, dummyRes as any, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const file = nodeReq.file;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded in the 'receipt' field" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded and validated successfully",
      file: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    });
  } catch (err: any) {
    // Return structured JSON error response when file is rejected
    return NextResponse.json(
      {
        success: false,
        error: err.message || "File upload failed due to size or type constraint",
      },
      { status: 400 }
    );
  }
}
