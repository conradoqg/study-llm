import { tool } from "@openai/agents"
import { z } from "zod"

export const KnowledgeGraphAttributesSchema = z.object({
    "Headquarters": z.string(),
    "CEO": z.string(),
    "Founded": z.string(),
    "Sales": z.string(),
    "Products": z.string(),
    "Founders": z.string(),
    "Subsidiaries": z.string(),
});
export type KnowledgeGraphAttributes = z.infer<typeof KnowledgeGraphAttributesSchema>;

export const OrganicAttributesSchema = z.object({
    "Products": z.string().optional(),
    "Founders": z.string().optional(),
    "Founded": z.string().optional(),
    "Industry": z.string().optional(),
    "Related People": z.string().optional(),
    "Date": z.string().optional(),
    "Areas Of Involvement": z.string().optional(),
});
export type OrganicAttributes = z.infer<typeof OrganicAttributesSchema>;

export const SitelinkSchema = z.object({
    "title": z.string(),
    "link": z.string(),
});
export type Sitelink = z.infer<typeof SitelinkSchema>;

export const PeopleAlsoAskSchema = z.object({
    "question": z.string(),
    "snippet": z.string(),
    "title": z.string(),
    "link": z.string(),
});
export type PeopleAlsoAsk = z.infer<typeof PeopleAlsoAskSchema>;

export const RelatedSearchSchema = z.object({
    "query": z.string(),
});
export type RelatedSearch = z.infer<typeof RelatedSearchSchema>;

export const SearchParametersSchema = z.object({
    q: z.string().describe("Search query"),
    autocorrect: z.boolean().default(true).describe("Autocorrect query"),
    location: z.string().nullish().describe("Search location (optional)"),
    gl: z.string().nullish().describe("Country code (e.g. us, optional)"),
    hl: z.string().nullish().describe("Language code (e.g. en, optional)"),
    tbs: z.string().nullish().describe("Date range (e.g. qdr:m, optional)"),
    num: z.number().default(10).describe("Number of results to return"),
    page: z.number().default(1).describe("Page number")
});

export type SearchParameters = z.infer<typeof SearchParametersSchema>;

export const SearchParametersResultSchema = z.object({
    ...SearchParametersSchema.shape,
    "type": z.string(),
});

export const KnowledgeGraphSchema = z.object({
    "title": z.string(),
    "type": z.string(),
    "website": z.string(),
    "imageUrl": z.string(),
    "description": z.string(),
    "descriptionSource": z.string(),
    "descriptionLink": z.string(),
    "attributes": KnowledgeGraphAttributesSchema,
});
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;

export const OrganicSchema = z.object({
    "title": z.string(),
    "link": z.string(),
    "snippet": z.string(),
    "sitelinks": z.array(SitelinkSchema).optional(),
    "position": z.number(),
    "attributes": OrganicAttributesSchema.optional(),
    "date": z.string().optional(),
});
export type Organic = z.infer<typeof OrganicSchema>;

export const SerperSearchResultSchema = z.object({
    "searchParameters": SearchParametersSchema,
    "knowledgeGraph": KnowledgeGraphSchema,
    "organic": z.array(OrganicSchema),
    "peopleAlsoAsk": z.array(PeopleAlsoAskSchema),
    "relatedSearches": z.array(RelatedSearchSchema),
});
export type SerperSearchResult = z.infer<typeof SerperSearchResultSchema>;

export const serperSearchTool = tool({
    name: 'serper_search',
    description: 'Search the web using Serper.dev for the latest news and trending companies.',
    parameters: SearchParametersSchema,
    execute: async (args: SearchParameters) => {
        const apiKey = process.env.SERPER_API_KEY
        if (!apiKey) throw new Error("SERPER_API_KEY environment variable not set")

        const resp = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify(args),
        })
        if (!resp.ok) {
            const text = await resp.text()
            throw new Error(`Serper.dev search failed: ${resp.status} ${text}`)
        }
        const json = await resp.json() as SerperSearchResult
        return JSON.stringify(json)
    },
})