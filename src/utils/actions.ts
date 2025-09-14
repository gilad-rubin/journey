import { ActionDefinition } from "@/types/workflow";

// Core Transformation specific actions
export const CT_ACTIONS: ActionDefinition[] = [
  {
    id: "is_a_no",
    name: "Is a 'No'?",
    description: "Check if a response indicates 'no' or similar negative responses",
    arguments: [
      {
        name: "response",
        type: "string",
        required: true,
        description: "The response text to analyze"
      }
    ],
    returnType: "boolean",
    category: "condition",
    examples: ["is_a_no('no')", "is_a_no('nope')", "is_a_no('')"]
  },
  {
    id: "is_potential_core_state",
    name: "Sounds like a Core State?",
    description: "Check if a response indicates a potential core state like unity, wholeness, or oneness",
    arguments: [
      {
        name: "response",
        type: "string",
        required: true,
        description: "The response text to analyze"
      }
    ],
    returnType: "boolean",
    category: "transformation",
    examples: ["is_potential_core_state('unity')", "is_potential_core_state('I want wholeness')"]
  },
  {
    id: "last_item_in",
    name: "Last Item in List",
    description: "Get the last item from a list of strings",
    arguments: [
      {
        name: "items_list",
        type: "array",
        required: true,
        description: "List of items to get the last item from"
      }
    ],
    returnType: "string",
    category: "transformation",
    examples: ["last_item_in(['safety', 'peace', 'wholeness'])"]
  }
];

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
export const ALL_ACTIONS = [...CT_ACTIONS, ...UTILITY_ACTIONS];

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
