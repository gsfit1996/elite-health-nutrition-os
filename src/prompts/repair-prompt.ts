export function buildRepairPrompt(currentMarkdown: string, issues: string[]): string {
  const issuesList = issues.map(issue => `- ${issue}`).join("\n")

  return `You must FIX the nutrition plan markdown to meet the required Elite Health format.

Here is the current markdown:
<<<
${currentMarkdown}
>>>

Validator found these issues:
${issuesList}

Rules:
- Keep as much of the existing content as possible.
- Add missing sections/options and ensure correct counts.
- Output ONLY corrected markdown.`
}
