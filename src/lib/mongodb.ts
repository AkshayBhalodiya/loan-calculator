import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseGlobal = typeof globalThis & {
  mongooseConn?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

const cached = (globalThis as MongooseGlobal).mongooseConn ?? {
  conn: null,
  promise: null,
};

(globalThis as MongooseGlobal).mongooseConn = cached;

export async function connectMongo() {
  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in environment variables.");
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string, {
      dbName: "loanwise",
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
