import 'dotenv/config'
import { checkbox, Separator } from '@inquirer/prompts';
import * as crew from './MAAE/crew/index.ts'
import * as openAILab1 from './MAAE/openAI/1_lab1.ts'
import * as openAILab2 from './MAAE/openAI/2_lab2.ts'
import * as openAILab3 from './MAAE/openAI/3_lab3.ts'
import * as openAILab4 from './MAAE/openAI/4_lab4.ts'
import * as tests from './MAAE/tests/index.ts'
import Terminal from './MAAE/common/terminal.ts';

// Main execution grouping labs
async function main() {
    const labs = [
        { group: 'MAAE - Crew', name: 'Lab', labs: crew },
        { group: 'MAAE - OpenAI', name: 'Lab 1', labs: openAILab1 },
        { group: 'MAAE - OpenAI', name: 'Lab 2', labs: openAILab2 },
        { group: 'MAAE - OpenAI', name: 'Lab 3', labs: openAILab3 },
        { group: 'MAAE - OpenAI', name: 'Lab 4', labs: openAILab4 },
        { group: 'MAAE - Tests', name: 'Lab', labs: tests }
    ];

    const selectedFunctions = await checkbox<() => Promise<void>>({
        message: 'Select lab to run:',
        choices:
            labs.reduce((acc, labDefinition) => {
                const options = acc.concat(
                    new Separator(`🥼 ${labDefinition.group}: ${labDefinition.name}`),
                    Object.keys(labDefinition.labs).map(key => ({
                        name: key,
                        value: labDefinition.labs[key]
                    }))
                );
                return options
            }, [])
    });

    for (const lab of selectedFunctions) {
        await lab();
    }
}

main().catch((err) => {
    console.error(err)
    Terminal.spinner.isSpinning && Terminal.spinner.stop()
})
