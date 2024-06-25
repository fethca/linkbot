# linkbot

Linkedin robot to automatically answer recruitment inmails

## Prerequisites

Before installing linkbot, ensure you have the following prerequisites met:

- Node.js installed on your system
- pnpm package manager installed
- Access to a Linkedin account with user and password
- An OpenAI api key, see their [documentation](https://platform.openai.com/docs/api-reference/authentication)

### Installation

To install the required node modules for linkbot, run the following command:

```sh
pnpm install
```

### Environment Setup

Create a `.env` file at the root directory of your project and include the following environment variables:

```
APP_STAGE=dev

LINKEDIN_PWD=your_password
LINKEDIN_USER=your_username
OPENAI_API_KEY=your_api_key

```
