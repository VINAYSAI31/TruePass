# Build note (delete after reading)

This project was written in an environment where Maven Central was blocked, so
`mvn clean test` could **not** be run before delivery. The code was reviewed by hand
but has not been compiled.

Please run this first on your machine (JDK 17+ and Maven 3.9+):

```bash
mvn clean test
```

The unit tests need no database. If Maven reports a compile error, send the output
back and it will be fixed. Once it passes you can delete this file.
