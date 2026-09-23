/**
 * Compile failures for the closed semantic IR (ADR-0019).
 */

export type SemanticIrIssue = {
	readonly code: string;
	readonly message: string;
	readonly path?: string;
};

export class SemanticIrError extends Error {
	readonly issues: readonly SemanticIrIssue[];

	constructor(issues: readonly SemanticIrIssue[]) {
		const summary =
			issues.length === 1
				? (issues[0]?.message ?? "semantic IR issue")
				: `${issues.length} semantic IR issues`;
		super(summary);
		this.name = "SemanticIrError";
		this.issues = issues;
	}
}
