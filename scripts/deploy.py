#!/usr/bin/env python

from datetime import datetime
import os
import sys
import subprocess
import boto3
import yaml

TIMESTAMP = datetime.utcnow().isoformat().replace(':', '').replace('-', '')
SETTINGS = yaml.safe_load(open(os.path.expanduser("~/.hexagony.net.yaml")))
BUCKET = SETTINGS["bucket"]
CLOUDFRONT_DISTRIBUTION_ID = SETTINGS["cloudfront_distribution_id"]
ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
BUILD_DIR = os.path.join(ROOT, 'build')

def runNpmScript(name):
    try:
        subprocess.run(f'npm run {name}', cwd=ROOT, shell=True, check=True)
    except subprocess.CalledProcessError:
        print(f'{name}: failed. Exiting.')
        sys.exit(1)

    print(f'{name}: succeeded.')

def buildSite():
    subprocess.run('npm run build', cwd=ROOT, shell=True, check=True)

def s3Upload():
    # s3 = boto3.client('s3')
    # for root, dirs, files in os.walk(BUILD_DIR):
    #   for name in files:
    #       path = os.path.join(root, name)
    #       with open(path, 'rb') as file:
    #           key = os.path.relpath(path, BUILD_DIR)
    #           s3.upload_fileobj(file, BUCKET, key)
    # The above code didn't set the mime type properly.
    subprocess.run(['aws', 's3', 'sync', BUILD_DIR, f's3://{BUCKET}'], check=True)
    print('Uploaded files to S3')

def invalidate():
    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudfront.html
    cloudFront = boto3.client('cloudfront')
    print('Creating CloudFront Invalidation')

    response = cloudFront.create_invalidation(
        DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch={
            'Paths': {
                'Quantity': 1,
                'Items': [
                    '/403.html',
                    '/404.html',
                    '/about.html',
                    '/index.html',
                ]
            },
            'CallerReference': TIMESTAMP
        }
    )

    invalidationId = response['Invalidation']['Id']
    status = response['Invalidation']['Status']
    print(f'{invalidationId} {status}')

    waiter = cloudFront.get_waiter('invalidation_completed')
    waiter.wait(
        DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
        Id=invalidationId,
        WaiterConfig={
            'Delay': 20,
            'MaxAttempts': 30
        }
    )

    response = cloudFront.get_invalidation(DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
        Id=invalidationId)

    status = response['Invalidation']['Status']
    print(f'Cloudfront Invalidation: {status}.')

def _main():
    runNpmScript("eslint")
    runNpmScript("tsc")
    runNpmScript("build")
    s3Upload()
    invalidate()

if __name__ == '__main__':
    _main()
