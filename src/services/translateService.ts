// translate.ts
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

// --- OPTIMIZATION 1: Client Instantiation ---
// Create the client once and reuse it. This avoids creating a new connection
// on every function call, improving performance and resource management.
const translateClient = new TranslateClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Translates a string using AWS Translate.
 * @param text The input string to translate.
 * @param to The ISO 639-1 code for the language to translate the text into.
 * @param from (Optional) The ISO 639-1 code for the source language. Defaults to "auto" for automatic detection.
 * @returns The translated string, or the original string on failure.
 */
export async function translate(
  text: string,
  to: string,
  from: string = "auto"
): Promise<string> {
  // --- OPTIMIZATION 2: Input Validation ---
  // Return early if there's no text to translate.
  if (!text || !text.trim() || to == "zh") {
    return text;
  }

  // --- OPTIMIZATION 3: Flexible Language Codes ---
  // The 'to' and 'from' parameters are now used directly, making the function
  // versatile instead of being hardcoded for Chinese-to-English only.
  const command = new TranslateTextCommand({
    SourceLanguageCode: from,
    TargetLanguageCode: to,
    Text: text,
  });

  try {
    const { TranslatedText } = await translateClient.send(command);
    // Fallback to original text if the translation result is empty.
    return TranslatedText || text;
  } catch (error) {
    // --- OPTIMIZATION 4: Improved Error Handling & Logging ---
    // Provides more specific and useful error messages for easier debugging.
    console.error("AWS Translate API Error:", error);
    if (error instanceof Error) {
      // It's often better to return the original text as a graceful fallback
      // rather than throwing an error that could break the user experience.
      return text;
    }
    // Return original text as a final fallback.
    return text;
  }
}