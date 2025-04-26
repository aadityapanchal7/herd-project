#!/usr/bin/env node

import { generateSampleEvents } from "./generate-sample-events"

console.log("Starting sample event generation...")

generateSampleEvents()
  .then(() => {
    console.log("Sample event generation completed successfully!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Error generating sample events:", error)
    process.exit(1)
  })
