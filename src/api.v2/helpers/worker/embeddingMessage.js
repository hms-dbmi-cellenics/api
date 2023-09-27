const message = {
  experimentId: 'cfe136a9-fced-4ba4-986b-c4d779627be5',
  taskName: 'configureEmbedding',
  input: {
    experimentId: 'cfe136a9-fced-4ba4-986b-c4d779627be5',
    taskName: 'configureEmbedding',
    processName: 'qc',
    ignoreSslCert: false,
    sampleUuid: '',
    uploadCountMatrix: false,
    authJWT: 'Bearer eyJraWQiOiIzNjJrVVpab0pvU1ExQ2o5Smd5Y0Z3MlRmNkprVzdRNVwvQWo1VFhjZVcwQT0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiOVktbVZHUFQwamJfQWhpX0FYMUlmdyIsInN1YiI6IjAyNTFlNDZkLTAyZWItNGVmZi1hNjRmLWE1Y2U5ZWQ0NGQ0MCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJjdXN0b206YWdyZWVkX2VtYWlscyI6ImZhbHNlIiwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmV1LXdlc3QtMS5hbWF6b25hd3MuY29tXC9ldS13ZXN0LTFfbUFRY2dlMFBSIiwiY29nbml0bzp1c2VybmFtZSI6IjAyNTFlNDZkLTAyZWItNGVmZi1hNjRmLWE1Y2U5ZWQ0NGQ0MCIsIm9yaWdpbl9qdGkiOiJlYjhjZjUxNi03ZjYzLTQwNDMtOTAwNy1lYzI3ZTY1ZjIxOWMiLCJhdWQiOiIzdm5tbm9sZnFuZDdmb25iYThwaWF1Nm5rcSIsImV2ZW50X2lkIjoiMjQ4MGI0ZGYtOTU2Yy00NThlLTg2MzctMzYzYTkyOGFjNWM2IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2OTUzNzU5NzAsIm5hbWUiOiJLcmlzdGlhbiIsImN1c3RvbTphZ3JlZWRfdGVybXMiOiJ0cnVlIiwiZXhwIjoxNjk1MzgzNjgzLCJpYXQiOjE2OTUzODAwODMsImp0aSI6IjQ1MGY5YjIxLTUxOGMtNDY1YS1iMzkzLTIwZGRmNmNiZjhhZCIsImVtYWlsIjoia3Jpc3RpYW5AYmlvbWFnZS5uZXQifQ.X0A7WgP_m3CxGwjfdPEQDy0irzf6yC-ECp8C4T3-T2OiHXUY8Hv2lCzwsgmfpJelXOIxkbn9jPAi2nvbjPyJ2NMPms2xt8DgWGLBYaw1wAODLbV7AavmDeO1YkVT3Ga0qQ1KtS-NIgriiZF7yAoPUctOmQpmiO2U21MvT3uzbitgpc-evjAHZF4QlsB1KLMqmJPK6Yf1cibjdlvMKuyZvkQYNWArLFJ5lW-eqzAChcN6iff6Z4MOSrkpAxcgMJex0XTyaUiIwqIQyqsK5Eifz7v0ID-S3TKszwNxnnJlcaPg6oMOpiZdxmmM17COlhPCR6aQrEdffILoUS69Tuj4Cw',
    config: {
      embeddingSettings: {
        method: 'umap',
        methodSettings: {
          tsne: {
            perplexity: 30,
            learningRate: 6181.333,
          },
          umap: {
            distanceMetric: 'cosine',
            minimumDistance: 0.3,
          },
        },
      },
      clusteringSettings: {
        method: 'louvain',
        methodSettings: {
          louvain: {
            resolution: 0.8,
          },
        },
      },
    },
  },
};


