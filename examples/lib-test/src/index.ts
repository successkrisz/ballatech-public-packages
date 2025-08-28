export type Foo = {
	bar: string
}

export const toFoo = (bar: string): Foo => ({ bar })
