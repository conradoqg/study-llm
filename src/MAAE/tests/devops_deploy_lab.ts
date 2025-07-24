import { tool, Agent, run } from '@openai/agents'
import { z } from 'zod'
import { select } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'

export async function devOpsDeployLab() {
  Terminal.logMarkdown('## 🥼 Lab: DevOps Deployment Orchestrator')

  // Tool: k8s_deploy
  const k8sTool = tool({
    name: 'k8s_deploy',
    description: 'Deploy or rollback applications in Kubernetes',
    parameters: z.object({ action: z.string() }),
    async execute({ action }) {
      // Stub: simulate kubectl CLI
      return { result: `kubectl ${action}` }
    },
  })

  // Tool: terraform_apply
  const infraTool = tool({
    name: 'terraform_apply',
    description: 'Apply or destroy Terraform configurations',
    parameters: z.object({ action: z.string() }),
    async execute({ action }) {
      // Stub: simulate terraform apply/destroy
      return { status: `terraform ${action}` }
    },
  })

  // Agent: deployment orchestrator
  const orchestratorAgent = new Agent({
    name: 'Deployment Orchestrator',
    instructions: dedent`
      You orchestrate deployments. Use k8s_deploy and terraform_apply tools to handle the requested action.
    `,
    tools: [k8sTool, infraTool],
    model: 'gpt-4o-mini',
  })

  const action = await select({
    message: 'Choose an action:',
    choices: ['Deploy to staging', 'Promote to production', 'Rollback last release'],
  })
  const prompt = JSON.stringify({ action })

  const result = await withTraceAndLog('Orchestrate deployment', () => run(orchestratorAgent, prompt))
  Terminal.logMarkdown(result.finalOutput)
}