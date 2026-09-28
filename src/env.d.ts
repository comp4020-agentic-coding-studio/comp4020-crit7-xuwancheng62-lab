declare namespace App {
  interface Locals {
    // Set once signed in, even before the profile is set up.
    studentId: string | undefined;
    // Only when the profile is complete; middleware guarantees it on every
    // page except sign-in, profile setup and the README.
    student: import("./lib/student").Student | undefined;
  }
}
