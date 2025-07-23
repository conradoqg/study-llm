import 'dotenv/config'
import { checkbox, Separator } from '@inquirer/prompts';
import * as lab2 from './MAAE/2_lab2.ts'

// Main execution grouping labs
async function main() {
    const labs = [{ group: 'MAAE', name: 'lab2', labs: lab2 }];

    const selectedFunctions = await checkbox<() => Promise<void>>({
        message: 'Select lab to run:',
        choices:
            labs.reduce((acc, labDefinition) => {
                const options = acc.concat(
                    new Separator(`🥼 ${labDefinition.group} ${labDefinition.name}`),
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
