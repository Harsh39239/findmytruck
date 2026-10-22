import type { Metadata } from "next";
import DemoClient from "./demo-client";

export const metadata: Metadata = { title: "FindMyTruck: live demo" };

export default function Page() {
  return <DemoClient />;
}
