"use client"

import { createAssociatedTokenAccountInstruction, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, createMintToInstruction, ExtensionType, getAssociatedTokenAddressSync, getMintLen, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID, TYPE_SIZE } from "@solana/spl-token"
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js"
import { useState } from "react"

export default function TokenLaunchpad() {
    const [name, setName] = useState<string>("")
    const [symbol, setSymbol] = useState<string>("")
    const [supply, setSupply] = useState<string>("")
    const [url, setUrl] = useState<string>("")
    const [link, setLink] = useState<string | null>(null)

    const { connection } = useConnection();
    const wallet = useWallet();

    if (!wallet) {
      console.error("Connect Wallet");
      return
    }

    async function createToken() {
      try {
        const mintKeypair = Keypair.generate();
        console.log(`Mint generated keypair: ${mintKeypair.publicKey.toBase58()}`);

        const metadata = {
          mint: mintKeypair.publicKey,
          name: "Neel",
          symbol: "Nl",
          uri: "https://cdn.100xdevs.com/metadata.json",
          additionalMetadata: []
        }

        const mintLen = getMintLen([ExtensionType.MetadataPointer]);
        const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
  
        const transaction = new Transaction().add(
          SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: mintLen,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
          }),
          createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey,TOKEN_2022_PROGRAM_ID),
          createInitializeMintInstruction(mintKeypair.publicKey, 9, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
          createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            mint: mintKeypair.publicKey,
            metadata: mintKeypair.publicKey,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            mintAuthority: wallet.publicKey,
            updateAuthority: wallet.publicKey,
          })
        )
        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.partialSign(mintKeypair);
  
        await wallet.sendTransaction(transaction, connection);
        console.log(`Token Mint created at ${mintKeypair.publicKey.toBase58()}`);

        const associatedToken = getAssociatedTokenAddressSync(
          mintKeypair.publicKey,
          wallet.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID,
        )

        setLink(associatedToken.toBase58())
        console.log(`ATA: ${associatedToken.toBase58()}`);

        const transaction2 = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            associatedToken,
            wallet.publicKey,
            mintKeypair.publicKey,
            TOKEN_2022_PROGRAM_ID,
          )
        );

        await wallet.sendTransaction(transaction2, connection);

        const transaction3 = new Transaction().add(
          createMintToInstruction(mintKeypair.publicKey, associatedToken, wallet.publicKey, 1000000000, [], TOKEN_2022_PROGRAM_ID)
        );

        await wallet.sendTransaction(transaction3, connection);

      } catch (e) {
        console.error(`Error while creating token: ${e}`);
      }
    } 

    return (
        <div className="my-24 mx-30">
            <div className="grid justify-center gap-4">
                <h1 className="text-3xl font-semibold flex justify-center">Solana Token Launchpad</h1>
                <input 
                  className="bg-gray-900 text-white rounded-md outline-none p-2" 
                  type="text" 
                  placeholder="Name" 
                  disabled
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input 
                  className="bg-gray-900 text-white rounded-md outline-none p-2" 
                  type="text" 
                  placeholder="Symbol" 
                  value={symbol}
                  disabled
                  onChange={(e) => setSymbol(e.target.value)}
                />
                <input 
                  className="bg-gray-900 text-white rounded-md outline-none p-2" 
                  type="text" 
                  placeholder="Supply"
                  disabled
                  value={supply}
                  onChange={(e) => setSupply(e.target.value)}
                />
                <input 
                  className="bg-gray-900 text-white rounded-md outline-none p-2" 
                  type="text" 
                  placeholder="Url" 
                  disabled
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <div className="flex justify-center">
                    <button 
                      className="bg-gray-900 p-2 rounded-md text-white"
                      onClick={createToken}
                    >Create Token</button>
                </div>
                <p className="text-gray-800 pt-5">Sorry Inputs are already hardcoded please just press Create Token button</p>
            </div>
                <div className="flex justify-center">
                  {link === null ? null : <p className="text-xl font-semibold">Associated Token Address: {link}</p>}
                </div>
        </div>
    )
}