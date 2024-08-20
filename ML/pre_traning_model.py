from google.cloud import storage
import pandas as pd
import io
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score
from joblib import dump

# Function to load data from GCS
def load_data_from_gcs(bucket_name, file_name):
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(file_name)
    data = blob.download_as_bytes()
    dataframe = pd.read_csv(io.BytesIO(data))
    return dataframe

# Load dataset
bucket_name = 'cencoredvideobucket'  # Change this to your bucket name
file_name = 'dataset.csv'  # Change this to your file namepyt
df = load_data_from_gcs(bucket_name, file_name)

# Handle NaN values: Replace NaN values in both the feature and target columns
df['Text_Column'] = df['Text_Column'].fillna("")  # Handle NaN in feature column
df['Label_Column'] = df['Label_Column'].fillna("missing_label")  # Handle NaN in target column

# Split the data into training, validation, and test sets
X_train, X_temp, y_train, y_temp = train_test_split(df['Text_Column'], df['Label_Column'], test_size=0.2, random_state=42)
X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.2, random_state=42)

# Vectorization
vectorizer = TfidfVectorizer()
X_train_vectorized = vectorizer.fit_transform(X_train)
X_val_vectorized = vectorizer.transform(X_val)
X_test_vectorized = vectorizer.transform(X_test)

# Model Training
model = MultinomialNB()
model.fit(X_train_vectorized, y_train)

# Predictions and Accuracies
# Training accuracy
y_train_pred = model.predict(X_train_vectorized)
train_accuracy = accuracy_score(y_train, y_train_pred)

# Validation accuracy
y_val_pred = model.predict(X_val_vectorized)
val_accuracy = accuracy_score(y_val, y_val_pred)

# Testing accuracy
y_test_pred = model.predict(X_test_vectorized)
test_accuracy = accuracy_score(y_test, y_test_pred)

# Output the accuracies
print(f"Training Accuracy: {train_accuracy}")
print(f"Validation Accuracy: {val_accuracy}")
print(f"Testing Accuracy: {test_accuracy}")

# Save model and vectorizer locally
local_model_filename = 'model.joblib'
dump(model, local_model_filename)

local_vectorizer_filename = 'vectorizer.joblib'
dump(vectorizer, local_vectorizer_filename)
print("Model and vectorizer saved locally.")

# The commented section for uploading the model to GCS remains the same and can be used if needed.

# The commented section for uploading the model to GCS remains the same and can be used if needed.

# # Upload the model to GCS
# client = storage.Client()
# model_bucket = client.bucket(bucket_name)
# model_blob = model_bucket.blob(local_model_filename)
# model_blob.upload_from_filename(local_model_filename)

# vectorizer_blob = model_bucket.blob(local_vectorizer_filename)
# vectorizer_blob.upload_from_filename(local_vectorizer_filename)

# print("Model uploaded to GCS.")
