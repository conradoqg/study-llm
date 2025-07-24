import 'dotenv/config'
import { checkbox, Separator } from '@inquirer/prompts';
import * as crewDebate from './MAAE/crew/debate.ts'
import * as financialResearcher from './MAAE/crew/financial_researcher.ts'
import * as stockPickerCrew from './MAAE/crew/stock_picker.ts'
import * as openAILab1 from './MAAE/openAI/1_lab1.ts'
import * as openAILab2 from './MAAE/openAI/2_lab2.ts'
import * as openAILab3 from './MAAE/openAI/3_lab3.ts'
import * as openAILab4 from './MAAE/openAI/4_lab4.ts'
import * as testsInteractive from './MAAE/tests/interactive_lab.ts'
import * as testsCustomerSupport from './MAAE/tests/customer_support_lab.ts'
import * as testsCustomerSupportConv from './MAAE/tests/customer_support_conversational_lab.ts'

// Main execution grouping labs
async function main() {
    const labs = [
        { group: 'MAAE - Crew', name: 'Debate', labs: crewDebate },
        { group: 'MAAE - Crew', name: 'Financial Researcher', labs: financialResearcher },
        { group: 'MAAE - Crew', name: 'Stock Picker', labs: stockPickerCrew },
        { group: 'MAAE - OpenAI', name: 'Lab 1', labs: openAILab1 },
        { group: 'MAAE - OpenAI', name: 'Lab 2', labs: openAILab2 },
        { group: 'MAAE - OpenAI', name: 'Lab 3', labs: openAILab3 },
        { group: 'MAAE - OpenAI', name: 'Lab 4', labs: openAILab4 },
        { group: 'MAAE - Tests', name: 'Interactive Lab', labs: testsInteractive },
        { group: 'MAAE - Tests', name: 'Customer Support Lab', labs: testsCustomerSupport },
        { group: 'MAAE - Tests', name: 'Customer Support Conversational Lab', labs: testsCustomerSupportConv },
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
