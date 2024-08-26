import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI();

// STRUCTURED OUTPUT
// https://platform.openai.com/docs/guides/structured-outputs
const CalendarEvent = z.object({
  name: z.string().describe("Name of the event"),
  date: z.string().describe("Date of the event"),
  participants: z.array(z.string()).describe("Array of participant names"),
});

async function structuredOutput() {
  const input = "i love trains";
  const completion = await openai.beta.chat.completions.parse({
    // not all models support this feature
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: "Extract the event information, only using the input.",
      },
      {
        role: "user",
        content: `INPUT: ${input}

        Only reply with information found in the input.
        If you cant get your answer from there, answer with "MISSING INFOMRATION"!
        `,
      },
    ],
    response_format: zodResponseFormat(CalendarEvent, "event"),
    temperature: 0,
  });

  //only for safety
  if (completion.choices[0].message.refusal) {
    console.log(completion.choices[0].message.refusal);
  } else {
    console.log(completion.choices[0].message.parsed);
  }
}

// FUNCTION CALLING
// https://platform.openai.com/docs/guides/function-calling

// Could use decide to send link or get all relevant data using structured output
function bookSalesDemo(name: string) {
  console.log("Book Sales Demo Called");
  console.log(`
    Hey ${name},

    Please book a demo call using this link: https://calendly....

    Cheers Quinn
    `);
}

// Could use RAG search to get relevant info from the documentation
function searchDocumentation(query: string) {
  console.log("Search Documentation Called");
  console.log(`Searching for "${query}"`);
}

function bugFound(bug: string) {
  console.log("Bug Found Called");
  console.log(`Bug: "${bug}"`);
  console.log("Created ticket and alerted the IT staff");
}

function forwardToHuman(message: string) {
  console.log("Forward To Human Called");
  console.log(`Message: "${message}"`);
  console.log("Message was forwarded to support staff");
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "bookSalesDemo",
      description: "Book a sales demo with someone from our sales team.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The customer's name.",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchDocumentation",
      description:
        "Retreive information from our internal documentation. Call this function when a user has a techincal question.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The query to search the documentation",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bugFound",
      description:
        "Alert the techical support team about a bug a user experienced. Call this function when a user tells you about a bug or error.",
      parameters: {
        type: "object",
        properties: {
          bug: {
            type: "string",
            description: "The description of the bug",
          },
        },
        required: ["bug"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "forwardToHuman",
      description:
        "Forward the mail to a human from our support team. Call this tool if non of the other tools can be used.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The mail sent by the user",
          },
        },
        required: ["message"],
        additionalProperties: false,
      },
    },
  },
];

async function functionCalling() {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `
      You are a email inbox management ai.
      You work for a SAAS company.
      You will receive emails for customers and decide which tool to call to process their request.`,
    },
    { role: "user", content: "How can i use you product with hubspot" },
  ];

  const completion = await openai.chat.completions.create({
    messages,
    model: "gpt-4o",
    tools: tools,
    tool_choice: "required",
  });

  // console.log(completion.choices[0].message.tool_calls);
  const toolCall = completion.choices[0].message.tool_calls?.[0];

  if (!toolCall) {
    throw new Error("No tool was used");
  }

  const args = JSON.parse(toolCall.function.arguments);

  switch (toolCall.function.name) {
    case "bookSalesDemo":
      bookSalesDemo(args.name);
      break;
    case "searchDocumentation":
      searchDocumentation(args.query);
      break;
    case "bugFound":
      bugFound(args.bug);
      break;
    case "forwardToHuman":
      forwardToHuman(args.message);
      break;
    default:
      throw new Error("Unknown function called");
  }
}

functionCalling();
