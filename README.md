# Bitespeed Identity Reconciliation Service

## Enpoint

- [For Testing - https://bitespeed.amrit.work/api](https://bitespeed.amrit.work/api)
- [Swagger UI](https://bitespeed.amrit.work/api-docs)

## Requirements

- Node.js (v16 or later)
- TypeScript
- PostgreSQL

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone http://github.com/PirateKing55/bitespeed
    cd bitespeed
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up the database:**

    - Ensure you have a running PostgreSQL instance.
    - Create a database for this service.
    - Configure the database connection by creating a `.env` file in the project root. You can copy the format from `.env.example`:

      ```env
      # PostgreSQL connection URL
      DATABASE_URL=

      # Port for the application server (optional, defaults to 3000)
      PORT=3000

      #Environment
      NODE_ENV="production"
      ```

    - The database schema (tables) will be automatically initialized by the service when it starts up (`initDb` function is called).

## Running the Application

1.  **Build the TypeScript code:**

    ```bash
    npm run build
    ```

    This compiles the TypeScript files from `src/` to JavaScript files in `dist/`.

2.  **Start the application:**

    ```bash
    npm run start
    ```

    This runs the compiled JavaScript code from `dist/index.js`. The server will start, and you should see a message like "Server is running on port [PORT]".

3.  **Development Mode (with auto-reloading):**
    For development, you can use:
    ```bash
    npm run dev
    ```
    This uses `nodemon` to monitor your TypeScript files for changes and automatically restart the server.

## API Endpoint

### `POST /identify`

Identifies a contact based on the provided email and/or phone number and returns a consolidated contact profile.

**Request Body:**

A JSON object containing an optional `email` and an optional `phoneNumber`. At least one of these must be provided.

```json
{
  "email"?: string,
  "phoneNumber"?: string
}
```

**Success Response Body (200 OK):**

A JSON object containing the consolidated contact information.

```json
{
  "contact": {
    "primaryContactId": number,
    "emails": string[], // Primary email first, then others
    "phoneNumbers": string[], // Primary phone number first, then others
    "secondaryContactIds": number[] // List of IDs of contacts that were merged/linked
  }
}
```
