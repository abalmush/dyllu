const c = require("ansi-colors");

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",

    description:
      "Learn how to create a publishable key: https://docs.medusajs.com/v2/resources/storefront-development/publishable-api-keys",
  },
];

if (process.env.NODE_ENV === "production") {
  requiredEnvs.push(
    {
      key: "MEDUSA_BACKEND_URL",
      description: "The production Medusa API origin.",
    },
    {
      key: "NEXT_PUBLIC_BASE_URL",
      description: "The canonical HTTPS storefront URL.",
    },
    {
      key: "REVALIDATE_SECRET",
      description:
        "The shared backend revalidation secret of at least 32 characters.",
    },
    {
      key: "ORDER_ACCESS_SECRET",
      description:
        "A unique secret of at least 32 characters used to sign guest order access tokens.",
    }
  );
}

function checkEnvVariables() {
  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key];
  });

  const invalidSecrets = ["REVALIDATE_SECRET", "ORDER_ACCESS_SECRET"].filter(
    (key) =>
      process.env.NODE_ENV === "production" &&
      process.env[key] &&
      process.env[key].length < 32
  );
  if (invalidSecrets.length > 0) {
    console.error(
      c.red.bold(
        `\n🚫 Error: ${invalidSecrets.join(", ")} must be at least 32 characters\n`
      )
    );
    process.exit(1);
  }

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    );

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`));
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`));
      }
    });

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    );

    process.exit(1);
  }
}

module.exports = checkEnvVariables;
