export interface ValidationResult {
  isValid: boolean
  issues: string[]
}

// Required sections in order
const REQUIRED_SECTIONS = [
  { pattern: /\*\*Welcome to your Elite Health Nutrition Plan,/i, name: "Title with client name" },
  { pattern: /^1\)\s*Opening/mi, name: "1) Opening" },
  { pattern: /^2\)\s*Your 90-Day Targets/mi, name: "2) Your 90-Day Targets" },
  { pattern: /^3\)\s*We'll achieve this with:/mi, name: "3) We'll achieve this with:" },
  { pattern: /^4\)\s*Table of Contents/mi, name: "4) Table of Contents" },
  { pattern: /^1\.\s*High-nutrient dense grocery list/mi, name: "1. High-nutrient dense grocery list" },
  { pattern: /^2\.\s*Breakfast options/mi, name: "2. Breakfast options" },
  { pattern: /^3\.\s*Lunch options/mi, name: "3. Lunch options" },
  { pattern: /^4\.\s*Dinner guidelines/mi, name: "4. Dinner guidelines" },
  { pattern: /^5\.\s*Light pre-bed meal options/mi, name: "5. Light pre-bed meal options" },
  { pattern: /^6\.\s*Convenient healthy snacks/mi, name: "6. Convenient healthy snacks" },
  { pattern: /^7\.\s*Dining-Out Guide/mi, name: "7. Dining-Out Guide" },
  { pattern: /^8\.\s*Hydration \+ electrolyte protocol/mi, name: "8. Hydration + electrolyte protocol" },
  { pattern: /^9\.\s*Essential supplements/mi, name: "9. Essential supplements" },
  { pattern: /^10\.\s*How to stay on track without tracking macros/mi, name: "10. How to stay on track without tracking macros" },
  { pattern: /^11\.\s*15-minute meal prep strategy/mi, name: "11. 15-minute meal prep strategy" },
  { pattern: /^12\.\s*Weekly habits & metrics/mi, name: "12. Weekly habits & metrics" },
  { pattern: /^13\.\s*How this fits your day/mi, name: "13. How this fits your day" },
]

function countItemsInSection(markdown: string, sectionStart: RegExp, sectionEnd: RegExp): number {
  const startIndex = markdown.search(sectionStart)
  if (startIndex === -1) return 0
  
  const afterStart = markdown.slice(startIndex)
  const endIndex = afterStart.search(sectionEnd)
  const sectionText = endIndex === -1 ? afterStart : afterStart.slice(0, endIndex)
  
  // Count bullet points or numbered items
  const bullets = sectionText.match(/^[\s]*[-*•]\s/gm) || []
  const numbered = sectionText.match(/^[\s]*\d+[.)]\s/gm) || []
  
  return bullets.length + numbered.length
}

function countProteinMentions(markdown: string): boolean {
  // Check if protein grams range is mentioned anywhere
  const proteinPattern = /\d+\s*[-–]\s*\d+\s*g.*protein|\d+\s*g.*protein.*range|protein.*\d+\s*[-–]\s*\d+\s*g/i
  return proteinPattern.test(markdown)
}

export function validateMarkdown(markdown: string, clientName: string): ValidationResult {
  const issues: string[] = []

  // Check title with client name
  const titlePattern = new RegExp(`\\*\\*Welcome to your Elite Health Nutrition Plan,\\s*${clientName}\\*\\*`, "i")
  if (!titlePattern.test(markdown)) {
    issues.push(`Missing or incorrect title: should be "**Welcome to your Elite Health Nutrition Plan, ${clientName}**"`)
  }

  // Check all required sections exist
  for (const section of REQUIRED_SECTIONS) {
    if (!section.pattern.test(markdown)) {
      issues.push(`Missing section: ${section.name}`)
    }
  }

  // Check breakfast options count (should be 3)
  const breakfastCount = countItemsInSection(
    markdown,
    /^2\.\s*Breakfast options/mi,
    /^3\.\s*Lunch options/mi
  )
  if (breakfastCount > 0 && breakfastCount !== 3) {
    issues.push(`Breakfast options should have exactly 3 options, found ${breakfastCount}`)
  }

  // Check lunch options (3 home + 3 out/office = 6 total)
  const lunchCount = countItemsInSection(
    markdown,
    /^3\.\s*Lunch options/mi,
    /^4\.\s*Dinner guidelines/mi
  )
  if (lunchCount > 0 && lunchCount < 6) {
    issues.push(`Lunch options should have 6 options (3 home + 3 out/office), found ${lunchCount}`)
  }

  // Check pre-bed options (should be 3)
  const preBedCount = countItemsInSection(
    markdown,
    /^5\.\s*Light pre-bed meal options/mi,
    /^6\.\s*Convenient healthy snacks/mi
  )
  if (preBedCount > 0 && preBedCount !== 3) {
    issues.push(`Pre-bed meal options should have exactly 3 options, found ${preBedCount}`)
  }

  // Check snacks count (8-12)
  const snacksCount = countItemsInSection(
    markdown,
    /^6\.\s*Convenient healthy snacks/mi,
    /^7\.\s*Dining-Out Guide/mi
  )
  if (snacksCount > 0 && (snacksCount < 8 || snacksCount > 12)) {
    issues.push(`Snacks should have 8-12 ideas, found ${snacksCount}`)
  }

  // Check supplements count (3-5 max)
  const supplementsCount = countItemsInSection(
    markdown,
    /^9\.\s*Essential supplements/mi,
    /^10\.\s*How to stay on track/mi
  )
  if (supplementsCount > 5) {
    issues.push(`Supplements should have 3-5 max, found ${supplementsCount}`)
  }

  // Check protein grams range is mentioned
  if (!countProteinMentions(markdown)) {
    issues.push("Missing explicit protein grams range in the plan")
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}
