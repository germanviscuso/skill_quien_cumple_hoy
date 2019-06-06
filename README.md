# Quién cumple años hoy?
Alexa Skill in Spanish that shows connecting to an external API using progressive response

Don't miss these steps:

1. Create an Alexa Hosted skill at developer.amazon.com/alexa
2. Choose Spanish (Spain) as language
3. Copy the contents of es-ES to the voice interacton model (Buld tab, JSON), then Save and Build
4. Enable APL in the Interfaces section of the voice interaction model (Build tab, Interfaces)
5. Go to the Code tab, then Media Storage: S3 link in bottom left and copy all images in the img directory of this project to the Media directory in S3
5. Also while in the Code tab, move the files of the lambda directory in this project to the lambda directory of the hosted skill (overwrite files if necessary, create missing files). Click on Save after pasting each file (Save does not Save all). Finally click on the Deploy button
6. Go to the Test tab and test it out!
