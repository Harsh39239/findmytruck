import type { Metadata } from "next";
import DriverTutorial from "./driver-tutorial";

export const metadata: Metadata = { title: "FindMyTruck: driver practice" };

export default function Page() {
  return <DriverTutorial />;
}
