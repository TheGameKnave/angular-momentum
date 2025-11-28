#!/bin/bash

# Fix auth.service.spec.ts by replacing fakeAsync with async for service method tests
# and adding await back

cd /Users/kduda/websites/angular-momentum/client/src/app/services

# Replace patterns in functional test blocks
perl -i -pe 's/(it\(.*should.*login.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*sign.*up.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*verify.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*resend.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*logout.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*password.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*email.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*delete.*account.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*export.*data.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*token.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*session.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*reset.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*include.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*handle.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*trigger.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*return.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*reject.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts
perl -i -pe 's/(it\(.*should.*set.*), fakeAsync\(\) =>/$1, async () =>/g' auth.service.spec.ts

# Add await back to service calls and remove tick()
perl -i -pe 's/const result = service\./const result = await service./g' auth.service.spec.ts
perl -i -pe 's/await service\./await service./g' auth.service.spec.ts
perl -i -pe 's/\n\s+tick\(\);/\n/g' auth.service.spec.ts

echo "Tests fixed!"
