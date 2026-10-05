import modal

MODEL_ID = "sentence-transformers/all-mpnet-base-v2"

app = modal.App("contextos-embeddings")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "sentence-transformers",
        "fastapi",
    )
)


@app.cls(
    image=image,
    cpu=2,
    memory=4096,
)
class Embedder:

    @modal.enter()
    def load_model(self):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(MODEL_ID)

    @modal.fastapi_endpoint(method="POST")
    def embed(self, data: dict):
        texts = data["texts"]

        if isinstance(texts, str):
            texts = [texts]

        # Must match ContextOS local/worker encode (normalized 768-d MPNet).
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        return {
            "embeddings": embeddings.tolist(),
            "dimension": int(embeddings.shape[1]),
            "dim": int(embeddings.shape[1]),
            "model": MODEL_ID,
        }
