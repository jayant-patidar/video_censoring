from moviepy.editor import VideoFileClip, AudioFileClip
import io
from pydub import AudioSegment
from joblib import load
from google.cloud import speech_v1p1beta1 as speech
from google.cloud import storage
from google.api_core.exceptions import RetryError
import moviepy.editor as mp
import functions_framework
import os
import time
import string
import logging
import tempfile

logging.basicConfig(level=logging.INFO)

# Load the pre-trained model and vectorizer
def download_blob(model_bucket_name, source_blob_name, destination_file_name):
    """Downloads a blob from the bucket."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(model_bucket_name)
    blob = bucket.blob(source_blob_name)

    blob.download_to_filename(destination_file_name)
    print(f"Blob {source_blob_name} downloaded to {destination_file_name}.")

# Specify your GCS bucket name and the paths of the model and vectorizer in GCS
model_bucket_name = "cencoredvideobucket"  # Replace with your bucket name
model_blob_name = "model.joblib"
vectorizer_blob_name = "vectorizer.joblib"
skipwords = ["the", "you", "have", "for", "of", "off", "on", "in", "up", "me"]

# Specify the local path to store the downloaded files
model_local_path = "model.joblib"
vectorizer_local_path = "vectorizer.joblib"

# Download the model and vectorizer from GCS
download_blob(model_bucket_name, model_blob_name, model_local_path)
download_blob(model_bucket_name, vectorizer_blob_name, vectorizer_local_path)

# Load the model and vectorizer
model = load(model_local_path)
vectorizer = load(vectorizer_local_path)

# Cache the vectorizer's feature names for efficient lookup
vectorizer_feature_names = set(vectorizer.get_feature_names_out())


@functions_framework.cloud_event
def hello_gcs(cloud_event):
    file_data = cloud_event.data
    bucket_name = file_data['bucket']
    file_name = file_data['name']

# def hello_gcs():
 
#     bucket_name = 'cencoredvideobucket'
#     file_name = 'aaaa.mp4'

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    modified_bucket=storage_client.bucket("modified_video")
    
    try:
        beep_sound_path = download_beep_sound(bucket)
        temp_video_path, temp_audio_path, modified_audio_path, output_video_path = prepare_file_paths(file_name)

        download_video_file(bucket, file_name, temp_video_path)

        extract_mono_audio_from_video(temp_video_path, temp_audio_path)

        upload_file_to_gcs('audio_for_processing', temp_audio_path, temp_audio_path)
        gcs_uri = f'gs://audio_for_processing/{os.path.basename(temp_audio_path)}'

        explicit_words_times = detect_explicit_words_from_audio_gcp(gcs_uri)

        mute_explicit_words_with_beep(temp_audio_path, beep_sound_path, explicit_words_times, modified_audio_path)

        print(modified_audio_path)
        print('-----------------------------------')

        add_audio_to_video(temp_video_path, modified_audio_path, output_video_path)

        upload_processed_video(modified_bucket, file_name, output_video_path)
    finally:
            ([temp_video_path, temp_audio_path, modified_audio_path, output_video_path, beep_sound_path])


def upload_file_to_gcs(bucket_name, source_file_name, destination_blob_name):
    # source_file_name=os.path.basename(source_file_name)
    destination_blob_name=os.path.basename(destination_blob_name)
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    blob.upload_from_filename(source_file_name)

    print(f"File {source_file_name} uploaded to {destination_blob_name}.")

def download_beep_sound(bucket):
    beep_sound_blob = bucket.blob("beep_sound.wav")
    _, beep_sound_path = tempfile.mkstemp(suffix=".wav")
    beep_sound_blob.download_to_filename(beep_sound_path)
    return beep_sound_path

def prepare_file_paths(file_name):
    _, temp_video_path = tempfile.mkstemp()
    _, temp_audio_path = tempfile.mkstemp(suffix=".wav")
    _, modified_audio_path = tempfile.mkstemp(suffix=".wav")
    _, output_video_path = tempfile.mkstemp(suffix=".mp4")
    print(modified_audio_path+"-----------------ssssssssssssssssssssssssss")
    return temp_video_path, temp_audio_path, modified_audio_path, output_video_path

def download_video_file(bucket, file_name, temp_video_path):
    blob = bucket.blob(file_name)
    blob.download_to_filename(temp_video_path)

def extract_mono_audio_from_video(video_path, output_audio_path):
    try:
        video = mp.VideoFileClip(video_path)
        video.audio.write_audiofile(output_audio_path, codec='pcm_s16le', ffmpeg_params=["-ac", "1"])
    finally:
        video.close()

def detect_explicit_words_from_audio_gcp(gcs_uri):
    client = speech.SpeechClient()
    audio = speech.RecognitionAudio(uri=gcs_uri)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=44100,
        language_code="en-US",
        enable_automatic_punctuation=True,
        use_enhanced=True,
        model='video',
        enable_word_time_offsets=True,
    )

    operation = client.long_running_recognize(config=config, audio=audio)

    print("Waiting for operation to complete...")
    while not operation.done():
        print('Still processing...')
        time.sleep(30)  # Wait for 30 seconds before checking again

    try:
        response = operation.result()  # No timeout specified
    except RetryError as e:
        print(f"Operation failed with RetryError: {e}")
        return []

    explicit_words_times = []

    for result in response.results:
        print(result.alternatives[0].transcript)
        print('------------------------------------------------------')
        for word_info in result.alternatives[0].words:
            word = word_info.word.lower()
             #---------------------------------------------------------------
            if any(char in string.punctuation for char in word):

                    word = word.translate(str.maketrans('', '', string.punctuation))
                #--------------------------------------------------------------------------
            start_time = word_info.start_time.total_seconds()
            end_time = word_info.end_time.total_seconds()

            if word in vectorizer.get_feature_names_out():
               
                word_vectorized = vectorizer.transform([word])
                label = model.predict(word_vectorized)[0]
                if label == 'explicit' and word not in skipwords:
                    print(f"{word} ---- explicit")
                    explicit_words_times.append((start_time, end_time))

    return explicit_words_times


def mute_explicit_words_with_beep(audio_path, beep_sound_path, explicit_words_times, modified_audio_path):
    original_audio = AudioSegment.from_file(audio_path)
    beep_sound = AudioSegment.from_file(beep_sound_path)
    modified_audio = original_audio[:0]

    last_end_time_ms = 0
    for start_time, end_time in explicit_words_times:
        start_time_ms = int(start_time * 1000)
        end_time_ms = int(end_time * 1000)
        modified_audio += original_audio[last_end_time_ms:start_time_ms]
        beep_duration = end_time_ms - start_time_ms
        beep_segment = beep_sound[:beep_duration]
        if beep_duration > len(beep_segment):
            beep_segment = beep_segment * (beep_duration // len(beep_segment) + 1)
        beep_segment = beep_segment[:beep_duration]
        modified_audio += beep_segment
        last_end_time_ms = end_time_ms

    modified_audio += original_audio[last_end_time_ms:]
    modified_audio.export(modified_audio_path, format="wav")
    


def add_audio_to_video(video_path, modified_audio_path, output_video_path):
    # gcs_uri_modified_audio_path = f'gs://audio_for_processing/{os.path.basename(modified_audio_path)}'
    video = mp.VideoFileClip(video_path)
    modified_audio = mp.AudioFileClip(modified_audio_path)
    final_video = video.set_audio(modified_audio)
    final_video.write_videofile(output_video_path, codec='libx264', audio_codec='aac')
    video.close()
    modified_audio.close()

def upload_processed_video(bucket, file_name, output_video_path):
    new_blob = bucket.blob(file_name)
    new_blob.upload_from_filename(output_video_path)

def cleanup_files(file_paths):
     max_attempts=10
     sleep_interval=1
     for file_path in file_paths:
        attempt = 0
        while attempt < max_attempts:
            try:
                os.remove(file_path)
                print(f"Successfully deleted {file_path}")
                break  # Exit the loop if deletion was successful
            except PermissionError as e:
                print(f"PermissionError on attempt {attempt+1} for {file_path}: {e}")
                time.sleep(sleep_interval)  # Wait before retrying
                attempt += 1
            except Exception as e:
                print(f"Error deleting {file_path}: {e}")
                break  # Exit the loop if an unexpected error occurs

        if attempt == max_attempts:
            print(f"Failed to delete {file_path} after {max_attempts} attempts.")

# hello_gcs()