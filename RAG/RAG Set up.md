
  A RAG (Retrieval-Augmented Generation) system lets an LLM answer using your own documents instead of relying only on its built-in knowledge.

The basic pipeline is:

```
Documents → split into chunks → embeddings → vector database
User question → embed question → retrieve relevant chunks → LLM answer with context
```

To build one from scratch:

1. Collect source material  
    Start with a narrow, reliable set of files: PDFs, Markdown docs, web pages, support articles, etc. Extract their text and retain metadata such as title, URL, page number, and last updated date.
    
2. Chunk the text  
    Split documents into overlapping passages—commonly 300–800 tokens with 10–20% overlap. Chunk by headings or paragraphs where possible; arbitrary character splits tend to lose meaning.
    
3. Create embeddings  
    Turn every chunk into a numeric vector using an embedding model. Similar meanings should yield nearby vectors.
    
4. Store vectors  
    Save each vector alongside its text and metadata in a vector-capable store. For a small prototype, use FAISS or Chroma locally. For production, consider PostgreSQL with pgvector, Pinecone, Weaviate, or Qdrant.
    
5. Retrieve at question time  
    Embed the user’s question, run a nearest-neighbor search, and retrieve the top 3–10 chunks. Apply metadata filters when useful, e.g. only current product documentation.
    
6. Generate with grounded context  
    Send the retrieved passages to the LLM with clear instructions: answer from the supplied context, cite sources, and say when the answer isn’t supported.
    

Example prompt shape:

```
System: Answer only from the provided context. If it is insufficient,
say you don't know. Cite sources using their titles.

Context:
[Source: refund-policy.md, section 3]
...

Question:
Can I get a refund after 30 days?
```

7. Evaluate it  
    Create a small test set of real questions and expected sources/answers. Measure:
    - Retrieval: did it fetch the right passage?
    - Answer quality: correct, complete, and grounded?
    - Faithfulness: no unsupported claims
    - Latency and cost

A minimal Python-style pseudocode version:

```
# Indexing
chunks = chunk_documents(load_documents("docs/"))
vectors = embed([chunk.text for chunk in chunks])
vector_db.upsert(vectors=vectors, metadata=chunks)

# Question answering
question_vector = embed([question])[0]
results = vector_db.search(question_vector, top_k=5)
context = "\n\n".join(result.text for result in results)

answer = llm(
    system="Answer only from supplied context; cite sources.",
    user=f"Context:\n{context}\n\nQuestion: {question}"
)
```

The two biggest determinants of quality are chunking and retrieval—not the chat model. Start simple, log every retrieved chunk, and improve from evidence: adjust chunk size, add reranking, introduce hybrid keyword + vector search, and ensure outdated documents are re-indexed or filtered.

Page 1 of 1