import { tool, Agent, run } from '@openai/agents'
import { z } from 'zod'
import { input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { flights, hotels } from '../common/travelData.ts'

export async function travelItineraryPlannerLab() {
  Terminal.logMarkdown('## 🥼 Lab: Travel Itinerary Planner')

  // Tool: search_flights
  const searchFlights = tool({
    name: 'search_flights',
    description: 'Find flights for given origin, destination, and date',
    parameters: z.object({ origin: z.string(), destination: z.string(), date: z.string() }),
    async execute({ origin, destination, date }) {
      const matches = flights.filter(
        (f) => f.origin === origin && f.destination === destination && f.date === date
      )
      return { flights: matches }
    },
  })

  // Tool: search_hotels
  const searchHotels = tool({
    name: 'search_hotels',
    description: 'Find hotels available in the given city',
    parameters: z.object({ city: z.string() }),
    async execute({ city }) {
      const matches = hotels.filter((h) => h.city === city)
      return { hotels: matches }
    },
  })

  // Agent: orchestrates the trip
  const plannerAgent = new Agent({
    name: 'Travel Planner',
    instructions: dedent`
      You are a travel planner. Use the search_flights tool to find flight options.
      Next, use the search_hotels tool to find hotels in the destination.
      Finally, summarize the selected flight and hotel into a one-day itinerary.
    `,
    tools: [searchFlights, searchHotels],
    model: 'gpt-4o-mini',
  })

  const origin = await input({ message: 'Origin city:' })
  const destination = await input({ message: 'Destination city:' })
  const date = await input({ message: 'Travel date (YYYY-MM-DD):' })
  const prompt = JSON.stringify({ origin, destination, date })
  const result = await Terminal.withSpinner('Planning travel', () => run(plannerAgent, prompt))
  Terminal.logMarkdown(result.finalOutput)
}