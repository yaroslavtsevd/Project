export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Polls REST API",
    version: "0.3.0",
    description: "TypeScript REST API for Users, Polls, Questions and Answers without database",
  },
  servers: [{ url: "http://localhost:3000" }],
  tags: [{ name: "Users" }, { name: "Polls" }, { name: "Questions" }, { name: "Answers" }],
  paths: {
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "Get users list",
        parameters: listParameters(["role", "search", "page", "pageSize", "sortBy", "sortDir"]),
        responses: okList("UserResponseDto"),
      },
      post: {
        tags: ["Users"],
        summary: "Create user",
        requestBody: jsonBody("CreateUserRequestDto"),
        responses: created("UserResponseDto"),
      },
    },
    "/api/users/{id}": crudById(
      "Users",
      "UserResponseDto",
      "UpdateUserRequestDto",
      "PatchUserRequestDto",
    ),
    "/api/polls": {
      get: {
        tags: ["Polls"],
        summary: "Get polls list",
        parameters: listParameters([
          "visibility",
          "search",
          "page",
          "pageSize",
          "sortBy",
          "sortDir",
        ]),
        responses: okList("PollResponseDto"),
      },
      post: {
        tags: ["Polls"],
        summary: "Create poll",
        requestBody: jsonBody("CreatePollRequestDto"),
        responses: created("PollResponseDto"),
      },
    },
    "/api/polls/{id}": crudById(
      "Polls",
      "PollResponseDto",
      "UpdatePollRequestDto",
      "PatchPollRequestDto",
    ),
    "/api/questions": {
      get: {
        tags: ["Questions"],
        summary: "Get questions list",
        parameters: listParameters([
          "pollId",
          "type",
          "search",
          "page",
          "pageSize",
          "sortBy",
          "sortDir",
        ]),
        responses: okList("QuestionResponseDto"),
      },
      post: {
        tags: ["Questions"],
        summary: "Create question",
        requestBody: jsonBody("CreateQuestionRequestDto"),
        responses: created("QuestionResponseDto"),
      },
    },
    "/api/questions/{id}": crudById(
      "Questions",
      "QuestionResponseDto",
      "UpdateQuestionRequestDto",
      "PatchQuestionRequestDto",
    ),
    "/api/answers": {
      get: {
        tags: ["Answers"],
        summary: "Get answers list",
        parameters: listParameters([
          "questionId",
          "userId",
          "page",
          "pageSize",
          "sortBy",
          "sortDir",
        ]),
        responses: okList("AnswerResponseDto"),
      },
      post: {
        tags: ["Answers"],
        summary: "Create answer",
        requestBody: jsonBody("CreateAnswerRequestDto"),
        responses: created("AnswerResponseDto"),
      },
    },
    "/api/answers/{id}": crudById(
      "Answers",
      "AnswerResponseDto",
      "UpdateAnswerRequestDto",
      "PatchAnswerRequestDto",
    ),
  },
  components: {
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "array", nullable: true, items: { type: "object" } },
            },
          },
        },
      },
      CreateUserRequestDto: {
        type: "object",
        required: ["name", "email", "role"],
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["Student", "Teacher", "Admin"] },
        },
      },
      UpdateUserRequestDto: {
        type: "object",
        required: ["name", "email", "role"],
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["Student", "Teacher", "Admin"] },
        },
      },
      PatchUserRequestDto: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["Student", "Teacher", "Admin"] },
        },
      },
      UserResponseDto: {
        type: "object",
        properties: {
          id: { type: "number" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
          deletedAt: { type: "string", nullable: true },
        },
      },
      CreatePollRequestDto: {
        type: "object",
        required: ["title", "author", "endDate", "visibility"],
        properties: {
          title: { type: "string" },
          author: { type: "string" },
          endDate: { type: "string" },
          visibility: { type: "string", enum: ["Public", "Private"] },
          description: { type: "string" },
        },
      },
      UpdatePollRequestDto: {
        type: "object",
        required: ["title", "author", "endDate", "visibility", "description"],
        properties: {
          title: { type: "string" },
          author: { type: "string" },
          endDate: { type: "string" },
          visibility: { type: "string" },
          description: { type: "string" },
        },
      },
      PatchPollRequestDto: {
        type: "object",
        properties: {
          title: { type: "string" },
          author: { type: "string" },
          endDate: { type: "string" },
          visibility: { type: "string" },
          description: { type: "string" },
        },
      },
      PollResponseDto: {
        type: "object",
        properties: {
          id: { type: "number" },
          title: { type: "string" },
          author: { type: "string" },
          endDate: { type: "string" },
          visibility: { type: "string" },
          description: { type: "string" },
          desc: { type: "string" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
          deletedAt: { type: "string", nullable: true },
        },
      },
      CreateQuestionRequestDto: {
        type: "object",
        required: ["pollId", "text", "type", "options", "order"],
        properties: {
          pollId: { type: "number" },
          text: { type: "string" },
          type: { type: "string", enum: ["single", "multiple", "text"] },
          options: { type: "array", items: { type: "string" } },
          order: { type: "number" },
        },
      },
      UpdateQuestionRequestDto: {
        type: "object",
        required: ["pollId", "text", "type", "options", "order"],
        properties: {
          pollId: { type: "number" },
          text: { type: "string" },
          type: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          order: { type: "number" },
        },
      },
      PatchQuestionRequestDto: {
        type: "object",
        properties: {
          pollId: { type: "number" },
          text: { type: "string" },
          type: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          order: { type: "number" },
        },
      },
      QuestionResponseDto: {
        type: "object",
        properties: {
          id: { type: "number" },
          pollId: { type: "number" },
          text: { type: "string" },
          type: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          order: { type: "number" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
          deletedAt: { type: "string", nullable: true },
        },
      },
      CreateAnswerRequestDto: {
        type: "object",
        required: ["questionId", "userId", "value"],
        properties: {
          questionId: { type: "number" },
          userId: { type: "number" },
          value: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        },
      },
      UpdateAnswerRequestDto: {
        type: "object",
        required: ["questionId", "userId", "value"],
        properties: {
          questionId: { type: "number" },
          userId: { type: "number" },
          value: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        },
      },
      PatchAnswerRequestDto: {
        type: "object",
        properties: {
          questionId: { type: "number" },
          userId: { type: "number" },
          value: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        },
      },
      AnswerResponseDto: {
        type: "object",
        properties: {
          id: { type: "number" },
          questionId: { type: "number" },
          userId: { type: "number" },
          value: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
          deletedAt: { type: "string", nullable: true },
        },
      },
    },
  },
};

function listParameters(names: string[]) {
  return names.map((name) => ({ name, in: "query", required: false, schema: { type: "string" } }));
}

function jsonBody(schemaName: string) {
  return {
    required: true,
    content: { "application/json": { schema: { $ref: `#/components/schemas/${schemaName}` } } },
  };
}

function okList(schemaName: string) {
  return {
    "200": {
      description: "OK",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: { type: "array", items: { $ref: `#/components/schemas/${schemaName}` } },
              total: { type: "number" },
              page: { type: "number" },
              pageSize: { type: "number" },
            },
          },
        },
      },
    },
  };
}

function created(schemaName: string) {
  return {
    "201": {
      description: "Created",
      content: { "application/json": { schema: { $ref: `#/components/schemas/${schemaName}` } } },
    },
    "400": { description: "Validation error" },
    "409": { description: "Conflict" },
  };
}

function crudById(tag: string, responseDto: string, updateDto: string, patchDto: string) {
  const idParam = { name: "id", in: "path", required: true, schema: { type: "integer" } };
  return {
    get: {
      tags: [tag],
      summary: `Get ${tag} by id`,
      parameters: [idParam],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": { schema: { $ref: `#/components/schemas/${responseDto}` } },
          },
        },
        "404": { description: "Not found" },
      },
    },
    put: {
      tags: [tag],
      summary: `Update ${tag} by id`,
      parameters: [idParam],
      requestBody: jsonBody(updateDto),
      responses: {
        "200": { description: "OK" },
        "400": { description: "Validation error" },
        "404": { description: "Not found" },
      },
    },
    patch: {
      tags: [tag],
      summary: `Patch ${tag} by id`,
      parameters: [idParam],
      requestBody: jsonBody(patchDto),
      responses: {
        "200": { description: "OK" },
        "400": { description: "Validation error" },
        "404": { description: "Not found" },
      },
    },
    delete: {
      tags: [tag],
      summary: `Soft delete ${tag} by id`,
      parameters: [idParam],
      responses: {
        "204": { description: "No Content" },
        "404": { description: "Not found" },
        "409": { description: "Conflict" },
      },
    },
  };
}
