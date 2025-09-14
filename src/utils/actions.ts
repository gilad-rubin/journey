import { ActionDefinition } from "@/types/workflow";

// Generic utility actions
export const UTILITY_ACTIONS: ActionDefinition[] = [
  {
    id: "contains_text",
    name: "Contains Text?",
    description: "Check if text contains a specific substring",
    arguments: [
      {
        name: "text",
        type: "string",
        required: true,
        description: "Text to search in"
      },
      {
        name: "substring",
        type: "string",
        required: true,
        description: "Substring to search for"
      }
    ],
    returnType: "boolean",
    category: "condition",
    examples: ["contains_text('Hello World', 'World')"]
  },
  {
    id: "text_length",
    name: "Text Length",
    description: "Get the length of a text string",
    arguments: [
      {
        name: "text",
        type: "string",
        required: true,
        description: "Text to measure"
      }
    ],
    returnType: "number",
    category: "utility",
    examples: ["text_length('Hello')"]
  }
];

// All available actions
export const ALL_ACTIONS = [...UTILITY_ACTIONS];

export const getActionsList = () => {
  return ALL_ACTIONS.map(action => ({
    value: action.id,
    label: action.name,
    description: action.description,
    returnType: action.returnType,
    category: action.category
  }));
};

export const getActionById = (id: string): ActionDefinition | undefined => {
  return ALL_ACTIONS.find(action => action.id === id);
};

export const getActionsByCategory = (category: string): ActionDefinition[] => {
  return ALL_ACTIONS.filter(action => action.category === category);
};

export const getActionsByReturnType = (returnType: string): ActionDefinition[] => {
  return ALL_ACTIONS.filter(action => action.returnType === returnType);
};
