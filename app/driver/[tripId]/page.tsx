import DriverClient from "./driver-client";

// The trip id comes from the link, so this page is built per request (it can't be prerendered).
export const instant = false;

export default async function DriverPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <DriverClient tripId={tripId} />;
}
