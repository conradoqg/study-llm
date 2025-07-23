import 'dotenv/config'
import { checkbox, Separator } from '@inquirer/prompts';
import * as openAiLab1 from './MAAE/1_lab1.ts'
import * as openAiLab2 from './MAAE/2_lab2.ts'
import * as openAiLab3 from './MAAE/3_lab3.ts'
import * as openAiLab4 from './MAAE/4_lab4.ts'

// Main execution grouping labs
async function main() {
    const labs = [
        { group: 'MAAE - OpenAI', name: 'Lab 1', labs: openAiLab1 },
        { group: 'MAAE - OpenAI', name: 'Lab 2', labs: openAiLab2 },
        { group: 'MAAE - OpenAI', name: 'Lab 3', labs: openAiLab3 },
        { group: 'MAAE - OpenAI', name: 'Lab 4', labs: openAiLab4 },
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

main().catch((err) => console.error(err))
