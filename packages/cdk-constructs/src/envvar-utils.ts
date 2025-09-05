import process from 'node:process'
/**
 * Reads an environment variable and throws an error if it is missing or empty.
 *
 * @param name - The name of the environment variable to read.
 * @returns The value of the environment variable.
 * @throws {Error} If the environment variable is not set or is an empty string.
 */
export const requireEnvVar = (name: string): string => {
	const value = process.env[name]
	if (value === undefined || value === '') {
		throw new Error(`Missing required environment variable: ${name}`)
	}
	return value
}
