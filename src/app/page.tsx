import { redirect } from "next/navigation";

export default function Home() {
  console.log('v1')
  redirect("/dashboard");
}
