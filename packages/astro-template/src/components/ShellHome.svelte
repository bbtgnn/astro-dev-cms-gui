<!-- Reference host home for the authoring shell -->

<main>
	<h1>Astro Dev CMS</h1>
	<p>Reference host for the authoring shell (dev route <code>/cms</code>).</p>
	<ul>
		<li>
			<a href="/cms"><strong>/cms</strong></a> — collections → entries → editor
		</li>
		<li><a href="/_cms/ok">/_cms/ok</a> — API heartbeat</li>
		<li><a href="/_cms/api/collections">/_cms/api/collections</a></li>
		<li><a href="/_cms/api/collections/posts">/_cms/api/collections/posts</a></li>
		<li>
			<a href="/_cms/api/collections/posts/hello">/_cms/api/collections/posts/hello</a>
		</li>
		<li><a href="/form-spike">/form-spike</a> — example form page</li>
		<li>
			<a href="/posts/hello"><strong>/posts/hello</strong></a> — real Astro
			preview route (ADR-0013)
		</li>
		<li>
			<a href="/blocks-demo">/blocks-demo</a> — parked (blocks outside v1 IR)
		</li>
		<li>
			<a href="/image-demo">/image-demo</a> — cover image (original asset)
		</li>
		<li>
			<code>PUT</code> invalid → 400; <code>DELETE</code> → 204 (allowlist deny
			covered by contract tests)
		</li>
	</ul>
</main>
