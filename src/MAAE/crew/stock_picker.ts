import terminal from "../common/terminal.ts"
import { Agent, run } from "@openai/agents"
import { withTraceAndLog } from "../common/agentsExtensions.ts"
import { serperSearchTool } from "../common/tool/serperSearchTool.ts"

// Crew workflow for selecting the best trending technology stock
export async function stockPickerWorkflow() {
    terminal.logMarkdown("## 🥼 Stock Picker Crew")

    const sector = "Technology"
    const currentDate = new Date().toISOString()

    const trendingCompanyFinder = new Agent({
        name: "Trending Company Finder",
        instructions: `
        Financial News Analyst that finds trending companies in a given sector.
        Read the latest news and find 2-3 companies that are trending in the last month.
        Always pick new companies and don't pick the same company twice.      
        `,
        model: "gpt-4o-mini",
        tools: [serperSearchTool],
    })

    const financialResearcher = new Agent({
        name: "Financial Researcher",
        instructions: `
        Senior Financial Researcher. Given a list of trending companies,
        provide comprehensive analysis of each, including market position,
        future outlook, and investment potential.
        `,
        model: "gpt-4o-mini",
        tools: [serperSearchTool],
    })

    const stockPicker = new Agent({
        name: "Stock Picker",
        instructions: `
            Stock Picker from Research. Given a list of researched companies with investment potential,
            select the single best company for investment. Provide a 1-sentence rationale, then a detailed report.
            `,
        model: "gpt-4o-mini",
    })

    // Step 1: Find trending companies
    const findPrompt = `
        Sector: ${sector}
        Current date: ${currentDate}

        Find the top 2-3 companies trending in the news for this sector.
    `
    const findRes = await withTraceAndLog("Find Trending Companies", () =>
        run(trendingCompanyFinder, findPrompt)
    )
    terminal.logMarkdown("### Trending Companies")
    terminal.logMarkdown(findRes.finalOutput)

    // Step 2: Research trending companies
    const researchPrompt = `
        Trending companies: ${findRes.finalOutput}

        Provide detailed analysis of each company.
    `
    const researchRes = await withTraceAndLog("Research Trending Companies", () =>
        run(financialResearcher, researchPrompt)
    )
    terminal.logMarkdown("### Research Report")
    terminal.logMarkdown(researchRes.finalOutput)

    // Step 3: Pick the best company for investment
    const pickPrompt = `
        Research report: ${researchRes.finalOutput}

        Select the single best company for investment,
        and provide a 1-sentence rationale followed by a detailed report.
    `
    const pickRes = await withTraceAndLog("Pick Best Company", () =>
        run(stockPicker, pickPrompt)
    )
    terminal.logMarkdown("### Final Decision")
    terminal.logMarkdown(pickRes.finalOutput)
}