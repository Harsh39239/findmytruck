import type { Metadata } from "next";
import ManagerPage from "../manager";

export const metadata: Metadata = { title: "FindMyTruck: dispatch dashboard" };

export default function Page() {
  return <ManagerPage />;
}
